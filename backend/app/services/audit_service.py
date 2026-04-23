from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_user_id: int | None = None,
    changes: dict | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changes=changes,
        ip_address=ip_address,
    )
    db.add(entry)
    # caller is responsible for commit
