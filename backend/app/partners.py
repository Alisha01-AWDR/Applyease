from .models import Application, Job, Submission
from .security import new_reference
from fastapi import HTTPException

class PartnerAdapter:
    """Small adapter boundary so real employer integrations can replace the demo safely."""
    name = "demo-employer"

    def validate(self, application: Application, job: Job, answers: dict[str, str]) -> None:
        required = {x.get("key") for x in (job.form or []) if x.get("required")}
        missing = [key for key in required if not answers.get(key)]
        if missing:
            raise HTTPException(400, "Required application answers are incomplete")
        if not application.confirmation_at:
            raise HTTPException(409, "Application has no recorded confirmation")

    def submit(self, application: Application, job: Job, answers: dict[str, str]) -> Submission:
        self.validate(application, job, answers)
        return Submission(application_id=application.id, reference=new_reference(), employer_status="submitted", confirmation_method=application.confirmation_method, payload_hash=application.confirmation_payload_hash)

DEMO_PARTNER = PartnerAdapter()
