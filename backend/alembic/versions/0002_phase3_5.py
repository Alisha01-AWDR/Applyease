"""Phase 3-5 files, resume linkage and audit trail.

Revision ID: 0002_phase3_5
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_phase3_5"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "file_assets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="SET NULL"), nullable=True),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("stored_name", sa.String(255), nullable=False, unique=True),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_file_assets_user_id", "file_assets", ["user_id"])
    op.create_index("ix_file_assets_application_id", "file_assets", ["application_id"])
    op.create_index("ix_file_assets_sha256", "file_assets", ["sha256"])
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event", sa.String(120), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"])
    op.add_column("disclosures", sa.Column("shared_with_employer", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("submissions", sa.Column("confirmation_method", sa.String(20), nullable=True))
    op.add_column("submissions", sa.Column("payload_hash", sa.String(64), nullable=True))
    op.add_column("applications", sa.Column("confirmation_method", sa.String(20), nullable=True))
    op.add_column("applications", sa.Column("confirmation_payload_hash", sa.String(64), nullable=True))
    op.add_column("applications", sa.Column("resume_file_id", sa.String(64), nullable=True))
    op.create_foreign_key("fk_applications_resume_file_id", "applications", "file_assets", ["resume_file_id"], ["id"], ondelete="SET NULL")

def downgrade():
    op.drop_constraint("fk_applications_resume_file_id", "applications", type_="foreignkey")
    op.drop_column("applications", "resume_file_id")
    op.drop_column("applications", "confirmation_payload_hash")
    op.drop_column("applications", "confirmation_method")
    op.drop_column("submissions", "payload_hash")
    op.drop_column("submissions", "confirmation_method")
    op.drop_index("ix_audit_events_user_id", table_name="audit_events")
    op.drop_column("disclosures", "shared_with_employer")
    op.drop_table("audit_events")
    op.drop_index("ix_file_assets_sha256", table_name="file_assets")
    op.drop_index("ix_file_assets_application_id", table_name="file_assets")
    op.drop_index("ix_file_assets_user_id", table_name="file_assets")
    op.drop_table("file_assets")
