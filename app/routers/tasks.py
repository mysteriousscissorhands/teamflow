
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import asc, desc

from ..database import get_db
from .. import models
from ..auth import get_current_user
from ..schemas import TaskCreate, TaskResponse, TaskUpdate, TaskStatus


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


# ================= VALIDATION HELPERS =================

def validate_project_ownership(project_id: int, db: Session, user_id: int):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


def validate_task_ownership(task_id: int, db: Session, user_id: int):
    task = (
        db.query(models.Task)
        .join(models.Project)
        .filter(
            models.Task.id == task_id,
            models.Project.owner_id == user_id
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found or not authorized"
        )

    return task


# ================= CREATE TASK =================

@router.post("/{project_id}", response_model=TaskResponse)
def create_task(
    project_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    validate_project_ownership(project_id, db, current_user.id)

    new_task = models.Task(
        title=task.title,
        description=task.description,
        project_id=project_id,
        status="todo"
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


# ================= GET TASKS =================

@router.get("/{project_id}", response_model=List[TaskResponse])
def get_tasks(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("id"),
    order: str = Query("asc"),
    status: Optional[TaskStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    validate_project_ownership(project_id, db, current_user.id)

    query = db.query(models.Task).filter(
        models.Task.project_id == project_id
    )

    if status:
        query = query.filter(models.Task.status == status.value)

    if search:
        query = query.filter(models.Task.title.ilike(f"%{search}%"))

    allowed_sort_fields = {"id", "title", "status"}

    if sort_by not in allowed_sort_fields:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    column = getattr(models.Task, sort_by)

    if order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid order value")

    query = query.order_by(
        asc(column) if order == "asc" else desc(column)
    )

    return query.offset(skip).limit(limit).all()


# ================= UPDATE TASK =================

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    task = validate_task_ownership(task_id, db, current_user.id)

    if task_data.title is not None:
        task.title = task_data.title

    if task_data.description is not None:
        task.description = task_data.description

    if task_data.status is not None:
        # Accept enum or string safely
        if isinstance(task_data.status, TaskStatus):
            task.status = task_data.status.value
        else:
            task.status = task_data.status

    db.commit()
    db.refresh(task)

    return task


# ================= DELETE TASK =================

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = validate_task_ownership(task_id, db, current_user.id)

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}

