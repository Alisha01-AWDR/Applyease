from datetime import datetime, timezone
import os
import hashlib
import json
from urllib.parse import quote
from urllib.parse import urlparse
import re
from pathlib import Path
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session
from .ai import analyze_with_claude
from .config import get_settings
from .crypto import decrypt_json, encrypt_json
from .storage import save_resume, file_path, read_resume
from .partners import DEMO_PARTNER
from .db import get_db
from .demo import ensure_demo_resume
from .models import Answer, Application, AuditEvent, Disclosure, FileAsset, Job, JobAnalysis, Profile, Submission, User, now_utc
from .schemas import AnalyzeIn, AuthRequest, ConfirmIn, DisclosureIn, DraftIn, RefreshRequest, SubmitIn, TokenResponse, ProfileIn
from .security import access_token, decode_file_access_token, decode_token, file_access_token, hash_password, new_reference, refresh_token, token_hash, verify_password

settings=get_settings()
app=FastAPI(title="ApplyEase API", version="1.2.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
bearer=HTTPBearer(auto_error=False)
_rate_state: dict[str, list[float]] = {}

@app.middleware("http")
async def basic_rate_limit(request, call_next):
    # Lightweight per-process protection for auth endpoints; production can add a shared Redis limiter.
    if request.url.path.startswith("/auth/"):
        import time
        key = request.client.host if request.client else "unknown"
        now = time.time()
        recent = [t for t in _rate_state.get(key, []) if now - t < 60]
        if len(recent) >= 30:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Too many authentication requests. Try again later."}, status_code=429)
        recent.append(now); _rate_state[key] = recent
    return await call_next(request)

@app.on_event("startup")
def startup():
    # Schema changes are managed by Alembic. The container entrypoint runs
    # `alembic upgrade head` before the API starts, so production startup never
    # mutates the schema implicitly.
    return None

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials: raise HTTPException(status_code=401, detail="Authentication required")
    try: uid=decode_token(credentials.credentials, "access")
    except Exception: raise HTTPException(status_code=401, detail="Invalid or expired access token")
    user=db.get(User, uid)
    if not user: raise HTTPException(status_code=401, detail="User not found")
    return user

def user_payload(user: User): return {"id": user.id, "email": user.email, "name": user.name}

def audit(db: Session, user_id: int | None, event: str, metadata: dict | None = None):
    db.add(AuditEvent(user_id=user_id, event=event, event_metadata=metadata or {}))

def issue_tokens(user: User, db: Session):
    at=access_token(user.id); rt=refresh_token(user.id); user.refresh_token_hash=token_hash(rt); db.commit()
    return TokenResponse(access_token=at, refresh_token=rt, user=user_payload(user))

def password_ok(password: str):
    if len(password) < 12: raise HTTPException(400, "Password must be at least 12 characters")

@app.get("/health")
def health(): return {"ok": True, "model": settings.anthropic_model, "ai_configured": bool(settings.anthropic_api_key)}


@app.post("/__test__/reset")
def test_reset(x_test_reset_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Reset only the demo account state when explicitly enabled for automated tests."""
    if settings.app_env not in {"test", "development"} or not settings.test_reset_token or x_test_reset_token != settings.test_reset_token:
        raise HTTPException(status_code=404, detail="Not found")
    db.execute(delete(Submission))
    db.execute(delete(Answer))
    db.execute(delete(Application))
    db.execute(delete(JobAnalysis))
    db.execute(delete(FileAsset))
    db.execute(delete(AuditEvent))
    db.execute(delete(Disclosure))
    db.commit()
    return {"ok": True}

@app.post("/auth/register", response_model=TokenResponse)
def register(req: AuthRequest, db: Session=Depends(get_db)):
    password_ok(req.password)
    email=req.email.lower().strip()
    if db.scalar(select(User).where(User.email==email)): raise HTTPException(409,"An account with that email already exists")
    user=User(email=email,name=(req.name or email.split("@")[0]).strip(),password_hash=hash_password(req.password))
    db.add(user); db.flush(); db.add(Profile(user_id=user.id,data={"name":user.name,"email":user.email})); db.commit()
    return issue_tokens(user,db)

@app.post("/auth/login", response_model=TokenResponse)
def login(req: AuthRequest, db: Session=Depends(get_db)):
    user=db.scalar(select(User).where(User.email==req.email.lower().strip()))
    if not user or not verify_password(req.password,user.password_hash): raise HTTPException(401,"Invalid email or password")
    return issue_tokens(user,db)

@app.post("/auth/refresh", response_model=TokenResponse)
def refresh(req: RefreshRequest, db: Session=Depends(get_db)):
    try: uid=decode_token(req.refresh_token,"refresh")
    except Exception: raise HTTPException(401,"Invalid refresh token")
    user=db.get(User,uid)
    if not user or not user.refresh_token_hash or user.refresh_token_hash != token_hash(req.refresh_token): raise HTTPException(401,"Refresh token revoked")
    return issue_tokens(user,db)

@app.post("/auth/logout")
def logout(user: User=Depends(current_user), db: Session=Depends(get_db)):
    user.refresh_token_hash=None; db.commit(); return {"ok":True}

@app.get("/profile")
def get_profile(user: User=Depends(current_user), db: Session=Depends(get_db)):
    p=db.scalar(select(Profile).where(Profile.user_id==user.id)); return p.data if p else {}

@app.patch("/profile")
def patch_profile(req: ProfileIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    p=db.scalar(select(Profile).where(Profile.user_id==user.id))
    if not p: p=Profile(user_id=user.id,data={}); db.add(p)
    p.data=req.data; audit(db, user.id, "profile.updated"); db.commit(); return p.data

def _visible_job(job: Job | None, user: User) -> Job:
    if not job or (job.owner_user_id is not None and job.owner_user_id != user.id):
        raise HTTPException(404, "Job not found")
    return job

@app.get("/jobs")
def list_jobs(
    query: str | None = None,
    location: str | None = None,
    job_type: str | None = None,
    user: User=Depends(current_user),
    db: Session=Depends(get_db),
):
    stmt = select(Job).where(or_(Job.owner_user_id.is_(None), Job.owner_user_id == user.id))
    if query and query.strip():
        term = f"%{query.strip()}%"
        stmt = stmt.where(or_(Job.title.ilike(term), Job.company.ilike(term), Job.summary.ilike(term), Job.location.ilike(term)))
    if location and location.strip():
        stmt = stmt.where(Job.location.ilike(f"%{location.strip()}%"))
    if job_type and job_type.strip():
        stmt = stmt.where(Job.type == job_type.strip())
    jobs=db.scalars(stmt.order_by(Job.created_at.desc())).all()
    return [job_out(j) for j in jobs]

def job_out(j: Job):
    return {
        "id": j.id,
        "title": j.title,
        "company": j.company,
        "location": j.location,
        "type": j.type,
        "summary": j.summary,
        "originalText": j.original_text,
        "skills": j.skills,
        "required": j.required,
        "preferred": j.preferred,
        "responsibilities": j.responsibilities,
        "process": j.process,
        "deadline": j.deadline,
        "source": j.source,
        "externalUrl": j.external_url,
        "applyMode": j.apply_mode,
        "form": j.form,
        "sourceSpans": j.source_spans or {},
    }

@app.get("/jobs/{job_id}")
def get_job(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    j=_visible_job(db.get(Job,job_id), user)
    return job_out(j)

@app.post("/jobs/import")
async def import_job(req: AnalyzeIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    text=req.text.strip()
    # Use AI when available; otherwise deterministic extraction still creates a real job from the pasted source.
    try:
        analysis, model = await analyze_with_claude(text)
        ai_status="ai"
    except Exception:
        analysis, model = heuristic_analysis(text), "fallback"
        ai_status="fallback"
    job_id=f"imported-{user.id}-" + token_hash(text)[:12]
    title=analysis.get("title") or first_line(text)[:120] or "Imported job"
    company=analysis.get("company") or "User-provided employer"
    j=db.get(Job,job_id)
    if not j:
        j=Job(id=job_id,title=title,company=company,location=analysis.get("location") or "Not stated",type=analysis.get("type") or "Not stated",summary=analysis.get("summary") or simple_summary(text),original_text=text,skills=analysis.get("skills",[]),required=analysis.get("required",[]),preferred=analysis.get("preferred",[]),responsibilities=analysis.get("responsibilities",[]),process=analysis.get("process",[]),deadline=analysis.get("deadline"),source="User-provided job text",owner_user_id=user.id,external_url=None,apply_mode="external",form=basic_external_form(),source_spans=analysis.get("sourceSpans", {}))
        db.add(j)
    else:
        j.summary=analysis.get("summary") or j.summary
        j.original_text=text
        j.source_spans=analysis.get("sourceSpans", j.source_spans or {})
    db.add(JobAnalysis(job_id=job_id,model=model,status=ai_status,payload=analysis)); db.commit()
    return {"job":job_out(j),"analysis":analysis,"status":ai_status}

@app.post("/jobs/import-url")
async def import_job_url(req: AnalyzeIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    raw_url = req.text.strip()
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not host:
        raise HTTPException(400, "Use a complete http:// or https:// job URL")
    if host not in settings.approved_job_host_list:
        raise HTTPException(403, "This job source is not approved for automated import. Paste the job text instead.")
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(raw_url, headers={"User-Agent": "ApplyEase-ApprovedJobImporter/1.0"})
        if response.status_code >= 300:
            raise HTTPException(502, "Approved job source could not be fetched")
        content_type = response.headers.get("content-type", "")
        if "text" not in content_type and "html" not in content_type:
            raise HTTPException(415, "Approved source did not return readable text")
        text = re.sub(r"<[^>]+>", " ", response.text)
        text = re.sub(r"\s+", " ", text).strip()
    except httpx.HTTPError:
        raise HTTPException(502, "Approved job source could not be fetched")
    if len(text) < 20:
        raise HTTPException(422, "The approved source did not contain enough job text")
    result = await import_job(AnalyzeIn(text=text), user, db)
    result["job"]["externalUrl"] = raw_url
    job = db.get(Job, result["job"]["id"])
    if job:
        job.external_url = raw_url
        db.commit()
    return result

@app.post("/jobs/{job_id}/analyze")
async def analyze_job(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    j=_visible_job(db.get(Job,job_id), user)
    try:
        analysis, model=await analyze_with_claude(j.original_text); ai_status="ai"
    except Exception:
        analysis=heuristic_analysis(j.original_text); model="fallback"; ai_status="fallback"
    if ai_status == "ai":
        if analysis.get("summary"): j.summary=analysis["summary"]
        for field in ("title", "company", "location", "type"):
            if analysis.get(field): setattr(j, field, analysis[field])
        for field in ("skills", "required", "preferred", "responsibilities", "process"):
            setattr(j, field, analysis.get(field, getattr(j, field)))
        if analysis.get("deadline") is not None:
            j.deadline=analysis["deadline"]
        j.source_spans=analysis.get("sourceSpans", {})
    else:
        j.source_spans=analysis.get("sourceSpans", j.source_spans or {})
    db.add(JobAnalysis(job_id=j.id,model=model,status=ai_status,payload=analysis)); db.commit()
    return {"job":job_out(j),"analysis":analysis,"status":ai_status}

@app.get("/jobs/{job_id}/analysis")
def latest_job_analysis(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    _visible_job(db.get(Job, job_id), user)
    analysis = db.scalar(select(JobAnalysis).where(JobAnalysis.job_id == job_id).order_by(JobAnalysis.created_at.desc()).limit(1))
    if not analysis:
        raise HTTPException(404, "No analysis available")
    return {"model": analysis.model, "status": analysis.status, "analysis": analysis.payload, "createdAt": analysis.created_at}

@app.get("/jobs/{job_id}/sources")
def job_sources(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    j=_visible_job(db.get(Job,job_id), user)
    return {"originalText":j.original_text,"source":j.source,"sourceSpans":j.source_spans or {}}

@app.post("/files/resume")
async def upload_resume(job_id: str | None = None, upload: UploadFile = File(...), user: User=Depends(current_user), db: Session=Depends(get_db)):
    application = None
    if job_id:
        application = get_or_create_application(user, job_id, db)
    file_id, stored_name, size_bytes, sha256 = await save_resume(upload)
    safe_original_name=Path(upload.filename or "resume").name[:255]
    asset = FileAsset(id=file_id, user_id=user.id, application_id=application.id if application else None, original_name=safe_original_name, stored_name=stored_name, mime_type=upload.content_type or "application/octet-stream", size_bytes=size_bytes, sha256=sha256)
    db.add(asset)
    if application:
        application.resume_file_id = file_id
        ans=db.scalar(select(Answer).where(Answer.application_id==application.id, Answer.key=="resume"))
        if not ans:
            ans=Answer(application_id=application.id,key="resume"); db.add(ans)
        ans.value=asset.original_name
        application.status="draft"
    audit(db, user.id, "resume.uploaded", {"file_id": file_id, "size": size_bytes})
    db.commit()
    return {"id": file_id, "name": asset.original_name, "size": size_bytes, "mimeType": asset.mime_type}

@app.get("/files/{file_id}")
def download_file(file_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    asset=db.scalar(select(FileAsset).where(FileAsset.id==file_id, FileAsset.user_id==user.id))
    if not asset: raise HTTPException(404, "File not found")
    path=file_path(asset.stored_name)
    if not path.exists(): raise HTTPException(404, "Stored file is missing")
    return Response(content=read_resume(asset.stored_name), media_type=asset.mime_type, headers={"Cache-Control":"private, no-store", "Content-Disposition": f"inline; filename*=UTF-8''{quote(asset.original_name)}"})

@app.post("/files/{file_id}/access")
def create_file_access(file_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    asset=db.scalar(select(FileAsset).where(FileAsset.id==file_id, FileAsset.user_id==user.id))
    if not asset: raise HTTPException(404, "File not found")
    expires_minutes=10
    return {"token": file_access_token(user.id, file_id, expires_minutes), "expiresInSeconds": expires_minutes * 60}

@app.get("/files/{file_id}/download")
def download_file_with_token(file_id: str, token: str, db: Session=Depends(get_db)):
    try:
        uid, token_file_id = decode_file_access_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired file access link")
    if token_file_id != file_id: raise HTTPException(403, "File access token does not match this file")
    asset=db.scalar(select(FileAsset).where(FileAsset.id==file_id, FileAsset.user_id==uid))
    if not asset: raise HTTPException(404, "File not found")
    path=file_path(asset.stored_name)
    if not path.exists(): raise HTTPException(404, "Stored file is missing")
    return Response(content=read_resume(asset.stored_name), media_type=asset.mime_type, headers={"Cache-Control":"private, no-store", "Content-Disposition": f"inline; filename*=UTF-8''{quote(asset.original_name)}"})

@app.delete("/files/{file_id}")
def delete_file(file_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    asset=db.scalar(select(FileAsset).where(FileAsset.id==file_id, FileAsset.user_id==user.id))
    if not asset: raise HTTPException(404, "File not found")
    path=file_path(asset.stored_name)
    if path.exists(): path.unlink()
    db.query(Application).filter(Application.resume_file_id==asset.id).update({Application.resume_file_id: None})
    audit(db, user.id, "resume.deleted", {"file_id": file_id})
    db.delete(asset); db.commit()
    return {"ok": True}

@app.get("/applications")
def applications(user: User=Depends(current_user), db: Session=Depends(get_db)):
    apps=db.scalars(select(Application).where(Application.user_id==user.id).order_by(Application.updated_at.desc())).all()
    result=[]
    for a in apps:
        j=db.get(Job,a.job_id); s=a.submission
        result.append({"id":a.id,"jobId":a.job_id,"status":a.status,"lastStep":a.last_step,"updatedAt":a.updated_at,"submittedAt":s.submitted_at if s else None,"reference":s.reference if s else None,"resumeFileId":a.resume_file_id,"job":job_out(j) if j else None})
    return result

def get_or_create_application(user: User, job_id: str, db: Session):
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a:
        _visible_job(db.get(Job,job_id), user)
        a=Application(user_id=user.id,job_id=job_id); db.add(a); db.flush()
    return a

@app.get("/applications/{job_id}/application-kit")
def application_kit(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=db.scalar(select(Application).where(Application.user_id==user.id, Application.job_id==job_id))
    j=_visible_job(db.get(Job, job_id), user)
    if not a:
        return {"job": job_out(j), "answers": {}, "resumeFileId": None, "status": ""}
    return {"job": job_out(j), "answers": {x.key:x.value for x in a.answers}, "resumeFileId": a.resume_file_id, "status": a.status}

@app.get("/applications/{job_id}/draft")
def get_draft(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a: return {"jobId":job_id,"step":1,"answers":{}}
    return {"jobId":job_id,"step":a.last_step,"answers":{x.key:x.value for x in a.answers},"savedAt":a.updated_at}

@app.patch("/applications/{job_id}/draft")
def patch_draft(job_id: str, req: DraftIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=get_or_create_application(user,job_id,db)
    if a.status in {"submitted", "submitted_external"}:
        raise HTTPException(409, "A submitted application cannot be edited")
    # Any edit after confirmation invalidates the confirmation. This prevents a
    # previously confirmed version from being submitted after its answers change.
    if a.confirmation_at is not None:
        a.confirmation_at=None
        a.confirmation_method=None
        a.confirmation_payload_hash=None
    a.last_step=req.step; a.status="draft"
    for k,v in req.answers.items():
        ans=db.scalar(select(Answer).where(Answer.application_id==a.id,Answer.key==k))
        if not ans: ans=Answer(application_id=a.id,key=k); db.add(ans)
        ans.value=v
        if k == "resume" and v.strip():
            asset = db.scalar(select(FileAsset).where(FileAsset.user_id == user.id, FileAsset.original_name == v.strip()).order_by(FileAsset.created_at.desc()))
            if asset:
                a.resume_file_id = asset.id
                asset.application_id = a.id
    db.commit(); return {"jobId":job_id,"step":a.last_step,"answers":{x.key:x.value for x in a.answers},"savedAt":a.updated_at}

def _validate_submission(a: Application, j: Job):
    if j.apply_mode != "partner":
        raise HTTPException(400, "This job does not support partner submission")
    answers={x.key: x.value.strip() for x in a.answers}
    DEMO_PARTNER.validate(a, j, answers)
    current_hash=hashlib.sha256(json.dumps({k: answers[k] for k in sorted(answers)}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if not a.confirmation_payload_hash or a.confirmation_payload_hash != current_hash:
        raise HTTPException(409, "Application changed after confirmation. Review and confirm it again.")
    if "resume" in required_keys(j) and not a.resume_file_id:
        raise HTTPException(400, "A resume must be uploaded before submission")

def _partner_submit(a: Application, j: Job, db: Session):
    _validate_submission(a, j)
    if a.status == "submitted" and a.submission:
        return submission_out(a)
    answers={x.key: x.value.strip() for x in a.answers}
    s=DEMO_PARTNER.submit(a, j, answers)
    db.add(s)
    a.status="submitted"
    audit(db, a.user_id, "application.submitted", {"job_id": a.job_id, "reference": s.reference, "partner": DEMO_PARTNER.name})
    db.commit()
    return submission_out(a)


@app.post("/applications/{job_id}/confirm")
def confirm(job_id: str, req: ConfirmIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if not req.acknowledge: raise HTTPException(400,"Explicit confirmation is required")
    a=get_or_create_application(user,job_id,db)
    j=_visible_job(db.get(Job,job_id), user)
    if a.status=="submitted": raise HTTPException(409,"Application already submitted")
    if j.apply_mode!="partner": raise HTTPException(400,"External jobs use the Application Kit")
    answers={x.key:x.value.strip() for x in a.answers}
    missing=[key for key in required_keys(j) if not answers.get(key)]
    if missing: raise HTTPException(400,"Required application answers are incomplete")
    if "resume" in required_keys(j) and not a.resume_file_id:
        raise HTTPException(400,"A resume must be uploaded before confirmation")
    payload_hash=hashlib.sha256(json.dumps({k: answers[k] for k in sorted(answers)}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    a.confirmation_at=now_utc(); a.confirmation_method=req.confirmation_method; a.confirmation_payload_hash=payload_hash; a.status="confirmed"
    audit(db, user.id, "application.confirmed", {"job_id": job_id, "confirmation_method": req.confirmation_method, "payload_hash": payload_hash})
    db.commit()
    return {"confirmed":True,"confirmedAt":a.confirmation_at.isoformat(),"jobId":job_id,"confirmationMethod":req.confirmation_method}


@app.post("/partner/employer/applications/{job_id}")
def partner_employer_submit(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    """Demo employer endpoint. In production this would be a separately authenticated partner integration."""
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a: raise HTTPException(404,"Application not found")
    j=_visible_job(db.get(Job,job_id), user)
    return _partner_submit(a,j,db)


@app.post("/applications/{job_id}/external-complete")
def external_complete(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a: raise HTTPException(404,"Application not found")
    j=_visible_job(db.get(Job,job_id), user)
    if j.apply_mode != "external": raise HTTPException(400,"This job uses partner submission")
    a.status="submitted_external"
    audit(db, user.id, "application.external_marked_submitted", {"job_id": job_id})
    db.commit()
    return {"ok":True,"jobId":job_id,"status":a.status,"updatedAt":a.updated_at.isoformat()}

@app.post("/applications/{job_id}/submit")
def submit(job_id: str, req: SubmitIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a: raise HTTPException(409,"Application not found")
    j=_visible_job(db.get(Job,job_id), user)
    return _partner_submit(a,j,db)

def required_keys(j: Job):
    if not j.form:
        return {"name", "email", "resume"}
    return {x.get("key") for x in (j.form or []) if x.get("required")}

def submission_out(a: Application):
    s=a.submission; return {"jobId":a.job_id,"reference":s.reference,"submittedAt":s.submitted_at.isoformat(),"status":"Submitted"}

@app.get("/applications/{job_id}/submission")
def get_submission(job_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    a=db.scalar(select(Application).where(Application.user_id==user.id,Application.job_id==job_id))
    if not a or not a.submission: raise HTTPException(404,"Receipt not found")
    return submission_out(a)

@app.get("/account/export")
def export_account(user: User=Depends(current_user), db: Session=Depends(get_db)):
    profile=db.scalar(select(Profile).where(Profile.user_id==user.id))
    apps=db.scalars(select(Application).where(Application.user_id==user.id).order_by(Application.created_at.asc())).all()
    disclosure=db.scalar(select(Disclosure).where(Disclosure.user_id==user.id))
    data={"account":{"id":user.id,"email":user.email,"name":user.name,"createdAt":user.created_at.isoformat()},"profile":profile.data if profile else {},"applications":[],"disclosure":{"enabled":bool(disclosure and disclosure.enabled),"sharedWithEmployer":bool(disclosure and disclosure.shared_with_employer),"payload": decrypt_json(disclosure.encrypted_payload) if disclosure else {}}}
    for a in apps:
        j=db.get(Job,a.job_id)
        data["applications"].append({"job":job_out(j) if j else None,"status":a.status,"lastStep":a.last_step,"updatedAt":a.updated_at.isoformat(),"confirmedAt":a.confirmation_at.isoformat() if a.confirmation_at else None,"confirmationMethod":a.confirmation_method,"answers":{x.key:x.value for x in a.answers},"submission":{"reference":a.submission.reference,"submittedAt":a.submission.submitted_at.isoformat()} if a.submission else None})
    audit(db, user.id, "account.exported")
    db.commit()
    return data

@app.delete("/account")
def delete_account(user: User=Depends(current_user), db: Session=Depends(get_db)):
    assets=db.scalars(select(FileAsset).where(FileAsset.user_id==user.id)).all()
    for asset in assets:
        path=file_path(asset.stored_name)
        if path.exists(): path.unlink()
    db.delete(user); db.commit()
    return {"ok": True}

@app.get("/settings/disclosure")
def disclosure_status(user: User=Depends(current_user), db: Session=Depends(get_db)):
    d=db.scalar(select(Disclosure).where(Disclosure.user_id==user.id)); return {"enabled":bool(d and d.enabled),"sharedWithEmployer":bool(d and d.shared_with_employer),"payload": decrypt_json(d.encrypted_payload) if d else {}}

@app.put("/settings/disclosure")
def update_disclosure(req: DisclosureIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    d=db.scalar(select(Disclosure).where(Disclosure.user_id==user.id))
    if not d: d=Disclosure(user_id=user.id,encrypted_payload=encrypt_json(req.payload),enabled=req.enabled,shared_with_employer=(req.enabled and req.shared_with_employer)); db.add(d)
    else: d.encrypted_payload=encrypt_json(req.payload); d.enabled=req.enabled; d.shared_with_employer=(req.enabled and req.shared_with_employer)
    audit(db, user.id, "disclosure.updated", {"enabled": d.enabled, "shared_with_employer": d.shared_with_employer}); db.commit(); return {"enabled":d.enabled,"sharedWithEmployer":d.shared_with_employer}

def _span(source: str, value: str, start_at: int = 0):
    value = value.strip()
    if not value:
        return None
    start = source.find(value, start_at)
    if start < 0:
        return None
    return {"start": start, "end": start + len(value), "text": value}

def first_line(text): return next((x.strip() for x in text.splitlines() if x.strip()), "")
def simple_summary(text): return re.split(r"(?<=[.!?])\s+", text.strip())[0][:400]

def _label_value(source: str, label: str):
    for line in source.splitlines():
        clean = line.strip()
        if clean.lower().startswith(label.lower() + ":"):
            value = clean.split(":", 1)[1].strip()
            return value, _span(source, value)
    return None, None

def heuristic_analysis(text):
    lines=[x.strip() for x in text.splitlines() if x.strip()]
    first=lines[0] if lines else "Imported job"
    if "—" in first:
        title, company = [x.strip() for x in first.split("—", 1)]
    elif " - " in first:
        title, company = [x.strip() for x in first.split(" - ", 1)]
    else:
        title, company = first[:120], "User-provided employer"
    sentences=[x.strip() for x in re.split(r"(?<=[.!?])\s+|\n+",text) if x.strip()]
    req=[]; pref=[]; resp=[]; process=[]
    for sentence in sentences:
        low=sentence.lower()
        if "required" in low: req.append(sentence)
        if "preferred" in low: pref.append(sentence)
        if any(k in low for k in ["responsibil", " will ", "support ", "help ", "build ", "analyz", "analyze "]): resp.append(sentence)
        if "application process" in low or "how to apply" in low or "apply" in low: process.append(sentence)
    deadline=next((s for s in sentences if "deadline" in s.lower() or "apply by" in s.lower() or "applications close" in s.lower()),None)
    location, location_span = _label_value(text, "Location")
    job_type, type_span = _label_value(text, "Type")
    summary = next((s for s in sentences if s != first and len(s) > 25), simple_summary(text))
    summary_span = _span(text, summary)
    required_spans=[_span(text, x) for x in req if _span(text, x)]
    preferred_spans=[_span(text, x) for x in pref if _span(text, x)]
    responsibility_spans=[_span(text, x) for x in resp if _span(text, x)]
    process_spans=[_span(text, x) for x in process if _span(text, x)]
    deadline_span=_span(text, deadline) if deadline else None
    source_spans={
        "title": _span(text, title), "company": _span(text, company),
        "location": location_span, "type": type_span, "summary": summary_span,
        "responsibilities": responsibility_spans, "required": required_spans,
        "preferred": preferred_spans, "process": process_spans,
        "skills": [], "deadline": deadline_span,
    }
    return {
        "title": title, "company": company, "location": location or "Not stated", "type": job_type or "Not stated",
        "summary": summary, "responsibilities": resp[:6], "required": req[:6], "preferred": pref[:6],
        "process": process[:4], "deadline": deadline, "skills": [], "sourceSpans": source_spans, "grounded": bool(summary_span or required_spans or preferred_spans or responsibility_spans or process_spans)
    }

def basic_external_form():
    return [
        {"key":"name","label":"What is your full name?","hint":"Use your full name.","type":"text","required":True,"prefillKey":"name"},
        {"key":"email","label":"What email should the employer use?","hint":"Use an address you check regularly.","type":"email","required":True,"prefillKey":"email"},
        {"key":"resume","label":"Which resume should we use?","hint":"Upload your resume.","type":"file","required":True,"prefillKey":"resume","accept":".pdf,.doc,.docx"},
        {"key":"why","label":"Why are you interested in this role?","hint":"Explain briefly.","type":"textarea","required":False},
    ]
