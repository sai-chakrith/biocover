FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY solver/requirements.txt ./solver/requirements.txt
RUN pip install --no-cache-dir -r solver/requirements.txt
# Fail the build early if the Linux CBC binary cannot execute.
RUN python -c "import pulp; model = pulp.LpProblem('cbc_check', pulp.LpMinimize); x = pulp.LpVariable('x', lowBound=1); model += x; model.solve(pulp.PULP_CBC_CMD(msg=False)); assert model.status == pulp.LpStatusOptimal"

COPY solver/ ./solver/
COPY coverage_matrix.csv grid_cells.csv cleaned_occurrences.csv weights.csv ./

CMD ["sh", "-c", "exec uvicorn server:app --app-dir solver --host 0.0.0.0 --port ${PORT:-8000}"]
