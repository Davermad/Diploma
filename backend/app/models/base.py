import enum
from typing import List, Optional
from datetime import datetime, date
import uuid

from sqlalchemy import ForeignKey, String, Table, Column, Text, DateTime, Date, Integer, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


task_categories = Table(
    "task_categories",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)

task_observers = Table(
    "task_observers",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role", String, nullable=False, server_default="MEMBER"),
)


class StatusEnum(enum.Enum):
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"


class PriorityEnum(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class IssueTypeEnum(enum.Enum):
    TASK = "TASK"
    BUG = "BUG"
    FEATURE = "FEATURE"
    EPIC = "EPIC"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    tasks_owned: Mapped[List["Task"]] = relationship(
        "Task", back_populates="owner", foreign_keys="Task.owner_id"
    )
    tasks_created: Mapped[List["Task"]] = relationship(
        "Task", back_populates="creator", foreign_keys="Task.creator_id"
    )
    tasks_executing: Mapped[List["Task"]] = relationship(
        "Task", back_populates="executor", foreign_keys="Task.executor_id"
    )
    projects: Mapped[List["Project"]] = relationship(back_populates="owner")
    member_projects: Mapped[List["Project"]] = relationship(
        secondary=project_members, back_populates="members"
    )
    observed_tasks: Mapped[List["Task"]] = relationship(
        secondary=task_observers, back_populates="observers"
    )
    task_comments: Mapped[List["TaskComment"]] = relationship(back_populates="user")
    project_messages: Mapped[List["ProjectMessage"]] = relationship(back_populates="user")
    global_messages: Mapped[List["GlobalMessage"]] = relationship(back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user")
    activity_logs: Mapped[List["ActivityLog"]] = relationship(back_populates="user")
    work_logs: Mapped[List["WorkLog"]] = relationship(back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    key_prefix: Mapped[str] = mapped_column(String, default="PRJ")

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User"] = relationship(back_populates="projects")
    members: Mapped[List["User"]] = relationship(
        secondary=project_members, back_populates="member_projects"
    )
    tasks: Mapped[List["Task"]] = relationship(back_populates="project")
    messages: Mapped[List["ProjectMessage"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    sprints: Mapped[List["Sprint"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped["Project"] = relationship(back_populates="sprints")
    tasks: Mapped[List["Task"]] = relationship(back_populates="sprint")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    color: Mapped[str] = mapped_column(String, default="#1890ff")

    tasks: Mapped[List["Task"]] = relationship(
        secondary=task_categories, back_populates="categories"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[StatusEnum] = mapped_column(String, default=StatusEnum.TODO.value)
    priority: Mapped[PriorityEnum] = mapped_column(String, default=PriorityEnum.MEDIUM.value)
    issue_type: Mapped[IssueTypeEnum] = mapped_column(String, default=IssueTypeEnum.TASK.value)
    deadline: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    story_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    parent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    parent: Mapped[Optional["Task"]] = relationship(
        remote_side=[id],
        foreign_keys=[parent_id],
        back_populates="children",
    )
    children: Mapped[List["Task"]] = relationship(
        foreign_keys=[parent_id],
        back_populates="parent",
    )

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    owner: Mapped["User"] = relationship("User", back_populates="tasks_owned", foreign_keys=[owner_id])
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    creator: Mapped["User"] = relationship("User", back_populates="tasks_created", foreign_keys=[creator_id])
    executor_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    executor: Mapped[Optional["User"]] = relationship(
        "User", back_populates="tasks_executing", foreign_keys=[executor_id]
    )

    project_id: Mapped[Optional[str]] = mapped_column(ForeignKey("projects.id"), nullable=True)
    project: Mapped[Optional["Project"]] = relationship(back_populates="tasks")

    sprint_id: Mapped[Optional[str]] = mapped_column(ForeignKey("sprints.id"), nullable=True)
    sprint: Mapped[Optional["Sprint"]] = relationship(back_populates="tasks")

    categories: Mapped[List["Category"]] = relationship(
        secondary=task_categories, back_populates="tasks"
    )
    observers: Mapped[List["User"]] = relationship(
        secondary=task_observers,
        back_populates="observed_tasks",
    )
    comments: Mapped[List["TaskComment"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    work_logs: Mapped[List["WorkLog"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    task: Mapped["Task"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship(back_populates="task_comments")


class ProjectMessage(Base):
    __tablename__ = "project_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="messages")
    user: Mapped["User"] = relationship(back_populates="project_messages")


class GlobalMessage(Base):
    """Общий чат — пишут все зарегистрированные пользователи."""

    __tablename__ = "global_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="global_messages")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="activity_logs")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")


class WorkLog(Base):
    __tablename__ = "work_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    minutes_spent: Mapped[int] = mapped_column(Integer)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    task: Mapped["Task"] = relationship(back_populates="work_logs")
    user: Mapped["User"] = relationship(back_populates="work_logs")
