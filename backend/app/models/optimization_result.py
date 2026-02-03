from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.database import Base


class OptimizationRun(Base):
    """Stores results of optimization runs."""

    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ampl_models.id"), nullable=False)
    data_file_id = Column(Integer, ForeignKey("data_files.id"), nullable=True)

    # Solver info
    solver_name = Column(String(50), nullable=False)
    solver_options = Column(JSON, default=dict)

    # Status
    status = Column(String(20), default="pending")  # pending, running, optimal, infeasible, error
    error_message = Column(Text, nullable=True)

    # Results
    objective_value = Column(Float, nullable=True)
    solve_time = Column(Float, nullable=True)  # Seconds
    iterations = Column(Integer, nullable=True)
    nodes = Column(Integer, nullable=True)  # For MIP
    gap = Column(Float, nullable=True)  # MIP gap

    # Full output
    solver_output = Column(Text, nullable=True)
    sensitivity_data = Column(JSON, nullable=True)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    model = relationship("AMPLModel", back_populates="optimization_runs")
    data_file = relationship("DataFile", back_populates="optimization_runs")
    variable_results = relationship(
        "VariableResult", back_populates="optimization_run", cascade="all, delete-orphan"
    )
    constraint_results = relationship(
        "ConstraintResult", back_populates="optimization_run", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<OptimizationRun(id={self.id}, status='{self.status}')>"


class VariableResult(Base):
    """Stores individual variable values from optimization runs."""

    __tablename__ = "variable_results"

    id = Column(Integer, primary_key=True, index=True)
    optimization_run_id = Column(
        Integer, ForeignKey("optimization_runs.id"), nullable=False
    )
    variable_name = Column(String(255), nullable=False)
    indices = Column(JSON, nullable=True)  # ["node1", "node2"] for indexed vars
    value = Column(Float, nullable=True)
    reduced_cost = Column(Float, nullable=True)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)

    # Relationships
    optimization_run = relationship("OptimizationRun", back_populates="variable_results")

    def __repr__(self):
        return f"<VariableResult(name='{self.variable_name}', value={self.value})>"


class ConstraintResult(Base):
    """Stores constraint information including shadow prices."""

    __tablename__ = "constraint_results"

    id = Column(Integer, primary_key=True, index=True)
    optimization_run_id = Column(
        Integer, ForeignKey("optimization_runs.id"), nullable=False
    )
    constraint_name = Column(String(255), nullable=False)
    indices = Column(JSON, nullable=True)
    body = Column(Float, nullable=True)  # Constraint body value
    dual = Column(Float, nullable=True)  # Shadow price
    slack = Column(Float, nullable=True)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)

    # Relationships
    optimization_run = relationship("OptimizationRun", back_populates="constraint_results")

    def __repr__(self):
        return f"<ConstraintResult(name='{self.constraint_name}', dual={self.dual})>"
