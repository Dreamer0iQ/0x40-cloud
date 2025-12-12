#!/bin/bash

RESULTS_FILE="audit_results.txt"
echo "Starting Security Audit..." > $RESULTS_FILE
echo "==========================" >> $RESULTS_FILE

# 1. Frontend Dependency Scan
echo "Running Frontend Dependency Scan..."
echo "[+] Frontend Dependency Scan (npm audit)" >> $RESULTS_FILE
cd frontend/vite-project
if [ -f "package-lock.json" ]; then
    npm audit --audit-level=moderate >> ../../$RESULTS_FILE 2>&1
else
    echo "No package-lock.json found, skipping npm audit" >> ../../$RESULTS_FILE
fi
cd ../..

echo "---------------------------------------------------" >> $RESULTS_FILE

# 2. Backend Static Analysis
echo "Running Backend Static Analysis (Gosec)..."
echo "[+] Backend Static Analysis (Gosec)" >> $RESULTS_FILE
cd backend
gosec -no-fail -fmt=text ./... >> ../$RESULTS_FILE 2>&1
cd ..

echo "---------------------------------------------------" >> $RESULTS_FILE

# 3. Filesystem & Secret Scan (Trivy)
echo "Running Filesystem Scan (Trivy)..."
echo "[+] Filesystem Scan (Trivy)" >> $RESULTS_FILE
trivy fs . --scanners vuln,secret,misconfig --format table >> $RESULTS_FILE 2>&1

echo "Audit Complete. Results saved to $RESULTS_FILE"
