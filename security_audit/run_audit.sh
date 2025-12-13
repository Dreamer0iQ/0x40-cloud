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


# 4. Dynamic Analysis (DAST)
echo "---------------------------------------------------" >> $RESULTS_FILE
echo "Running Dynamic Analysis..."
echo "[+] Dynamic Analysis" >> $RESULTS_FILE

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "Backend detected on port 8080. Running Nuclei and Custom Pentest..."
    
    echo "Running Nuclei..."
    # Running only critical and high severity templates to keep it fast, or standard scan
    nuclei -u http://localhost:8080 -severity critical,high,medium -o nuclei_results.txt
    cat nuclei_results.txt >> $RESULTS_FILE
    rm nuclei_results.txt
    
    echo "Running Custom Pentest Suite..."
    python3 security_audit/pentest_suite.py
    # pentest_suite.py appends to pentest_report.txt, let's merge it
    if [ -f "pentest_report.txt" ]; then
        cat pentest_report.txt >> $RESULTS_FILE
        rm pentest_report.txt
    fi
else
    echo "[-] Port 8080 not listening. Skipping DAST (Nuclei/Pentest Suite). Please run 'docker-compose up' to enable dynamic checks." >> $RESULTS_FILE
fi

echo "Audit Complete. Results saved to $RESULTS_FILE"
