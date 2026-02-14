"""API routes for data import/export."""

import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd

router = APIRouter()


@router.post("/import/excel")
async def import_excel(file: UploadFile = File(...)):
    """Import an Excel file and convert to AMPL .dat format.

    Supports worksheets named after AMPL constructs:
    - Sets: Sheet with single column becomes a set
    - Parameters: Sheet with index columns + value column becomes indexed param
    """
    original_filename = file.filename
    if not original_filename:
        raise HTTPException(status_code=400, detail="File must be Excel format")

    filename = original_filename.lower()
    if not filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be Excel format")

    try:
        contents = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(contents))

        dat_content = []
        sheet_info = []

        for sheet_name in excel_data.sheet_names:
            df = pd.read_excel(excel_data, sheet_name=sheet_name)

            if df.empty:
                continue

            # Determine type based on structure
            if len(df.columns) == 1:
                # Single column = set
                set_name = str(sheet_name).upper().replace(" ", "_")
                members = " ".join(str(v) for v in df.iloc[:, 0].dropna())
                dat_content.append(f"set {set_name} := {members};")
                sheet_info.append({
                    "sheet": sheet_name,
                    "type": "set",
                    "name": set_name,
                    "count": len(df),
                })

            elif len(df.columns) == 2:
                # Two columns = simple indexed parameter
                param_name = str(sheet_name).lower().replace(" ", "_")
                dat_content.append(f"param {param_name} :=")
                for _, row in df.iterrows():
                    dat_content.append(f"    {row.iloc[0]} {row.iloc[1]}")
                dat_content.append(";")
                sheet_info.append({
                    "sheet": sheet_name,
                    "type": "param",
                    "name": param_name,
                    "count": len(df),
                })

            else:
                # Multiple columns = table format parameter
                param_name = str(sheet_name).lower().replace(" ", "_")
                # First column is row index, rest are column indices
                col_headers = " ".join(str(c) for c in df.columns[1:])
                dat_content.append(f"param {param_name}:")
                dat_content.append(f"    {col_headers} :=")
                for _, row in df.iterrows():
                    values = " ".join(str(v) for v in row.iloc[1:])
                    dat_content.append(f"    {row.iloc[0]} {values}")
                dat_content.append(";")
                sheet_info.append({
                    "sheet": sheet_name,
                    "type": "param_table",
                    "name": param_name,
                    "rows": len(df),
                    "cols": len(df.columns) - 1,
                })

        return {
            "dat_content": "\n".join(dat_content),
            "sheets_processed": sheet_info,
            "preview": "\n".join(dat_content[:20]) + "..." if len(dat_content) > 20 else "\n".join(dat_content),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Excel file: {str(e)}")


@router.post("/export/excel")
async def export_results_to_excel(result_id: int):
    """Export optimization results to Excel format."""
    from app.db.database import SessionLocal
    from app.models import OptimizationRun, VariableResult, ConstraintResult

    db = SessionLocal()

    try:
        opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
        if not opt_run:
            raise HTTPException(status_code=404, detail="Result not found")

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                "Property": [
                    "Status", "Solver", "Objective Value",
                    "Solve Time (s)", "Iterations"
                ],
                "Value": [
                    opt_run.status, opt_run.solver_name, opt_run.objective_value,
                    opt_run.solve_time, opt_run.iterations
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="Summary", index=False)

            # Variables sheet
            var_results = db.query(VariableResult).filter(
                VariableResult.optimization_run_id == result_id
            ).all()

            if var_results:
                var_data = []
                for v in var_results:
                    var_data.append({
                        "Variable": v.variable_name,
                        "Index": str(v.indices) if v.indices is not None else "",
                        "Value": v.value,
                        "Reduced Cost": v.reduced_cost,
                        "Lower Bound": v.lower_bound,
                        "Upper Bound": v.upper_bound,
                    })
                pd.DataFrame(var_data).to_excel(writer, sheet_name="Variables", index=False)

            # Constraints sheet
            con_results = db.query(ConstraintResult).filter(
                ConstraintResult.optimization_run_id == result_id
            ).all()

            if con_results:
                con_data = []
                for c in con_results:
                    con_data.append({
                        "Constraint": c.constraint_name,
                        "Index": str(c.indices) if c.indices is not None else "",
                        "Body": c.body,
                        "Dual (Shadow Price)": c.dual,
                        "Slack": c.slack,
                    })
                pd.DataFrame(con_data).to_excel(writer, sheet_name="Constraints", index=False)

        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=results_{result_id}.xlsx"}
        )

    finally:
        db.close()


@router.get("/templates")
async def get_data_templates():
    """Get example data file templates."""
    templates = [
        {
            "name": "Transportation Problem",
            "description": "Supply and demand data for transportation optimization",
            "content": """# Transportation Problem Data

set ORIGINS := Seattle Denver;
set DESTINATIONS := NewYork Chicago LA;

param supply :=
    Seattle 350
    Denver 600;

param demand :=
    NewYork 325
    Chicago 300
    LA 275;

param cost:
            NewYork Chicago LA :=
    Seattle     2.5     1.7    1.8
    Denver      1.8     1.3    1.4;
""",
        },
        {
            "name": "Production Planning",
            "description": "Multi-period production planning data",
            "content": """# Production Planning Data

set PRODUCTS := A B C;
set PERIODS := 1 2 3 4;

param demand {PRODUCTS, PERIODS};
param capacity {PERIODS};
param cost {PRODUCTS};

param demand:
        1   2   3   4 :=
    A   100 120 140 130
    B   80  90  100 110
    C   60  70  80  90;

param capacity := 1 300 2 320 3 350 4 340;

param cost := A 10 B 15 C 12;
""",
        },
    ]
    return templates
