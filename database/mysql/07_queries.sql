-- ============================================================
-- 07_queries.sql  —  Complex Query Showcase (DML SELECT)
-- Demonstrates JOIN, GROUP BY, HAVING, ORDER BY, aggregates,
-- subqueries, and set logic. Run AFTER 02_seed.sql.
-- ============================================================
USE MultiHospitalHealthcare;

-- Q1. INNER JOIN across 4 tables: appointments with doctor + department
SELECT a.Appointment_ID, p.Patient_Name, d.Doctor_Name, dep.Department_Name,
       a.Appointment_DateTime, a.Appointment_Status
FROM Appointment a
JOIN Patient p      ON a.Patient_ID = p.Patient_ID
JOIN Doctor d       ON a.Doctor_ID  = d.Doctor_ID
JOIN Department dep ON d.Department_ID = dep.Department_ID
ORDER BY a.Appointment_DateTime;

-- Q2. GROUP BY + aggregate: number of doctors per department
SELECT dep.Department_Name, COUNT(d.Doctor_ID) AS Doctor_Count
FROM Department dep
LEFT JOIN Doctor d ON dep.Department_ID = d.Department_ID
GROUP BY dep.Department_ID, dep.Department_Name
ORDER BY Doctor_Count DESC;

-- Q3. GROUP BY + HAVING: doctors with more than one appointment
SELECT d.Doctor_Name, COUNT(a.Appointment_ID) AS Total_Appointments
FROM Doctor d
JOIN Appointment a ON d.Doctor_ID = a.Doctor_ID
GROUP BY d.Doctor_ID, d.Doctor_Name
HAVING COUNT(a.Appointment_ID) > 1
ORDER BY Total_Appointments DESC;

-- Q4. Aggregate across billing: total revenue per payment status
SELECT Payment_Status, COUNT(*) AS Num, SUM(Amount) AS Total_Amount, AVG(Amount) AS Avg_Amount
FROM Payment
GROUP BY Payment_Status;

-- Q5. Subquery (scalar): patients older than the average patient age
SELECT Patient_Name, TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE()) AS Age
FROM Patient
WHERE TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE()) >
      (SELECT AVG(TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE())) FROM Patient)
ORDER BY Age DESC;

-- Q6. Correlated subquery: patients who have at least one pending payment
SELECT p.Patient_Name
FROM Patient p
WHERE EXISTS (
    SELECT 1 FROM Payment pay
    WHERE pay.Patient_ID = p.Patient_ID AND pay.Payment_Status = 'Pending'
);

-- Q7. IN subquery: medicines currently prescribed to any patient
SELECT Medicine_Name, Stock_Quantity
FROM Medicine
WHERE Medicine_ID IN (SELECT DISTINCT Medicine_ID FROM Prescription_Medicine)
ORDER BY Medicine_Name;

-- Q8. Multi-join with aggregate: total prescribed medicines per patient
SELECT p.Patient_Name, COUNT(pm.Medicine_ID) AS Medicines_Prescribed
FROM Patient p
JOIN Prescription pr       ON p.Patient_ID = pr.Patient_ID
JOIN Prescription_Medicine pm ON pr.Prescription_ID = pm.Prescription_ID
GROUP BY p.Patient_ID, p.Patient_Name
ORDER BY Medicines_Prescribed DESC;

-- Q9. LEFT JOIN to find gaps: patients with NO insurance policy
SELECT p.Patient_Name
FROM Patient p
LEFT JOIN Insurance i ON p.Patient_ID = i.Patient_ID
WHERE i.Insurance_ID IS NULL;

-- Q10. Bed utilisation per hospital (CASE + aggregate)
SELECT h.Hospital_Name,
       SUM(CASE WHEN b.Status = 'Occupied'    THEN 1 ELSE 0 END) AS Occupied,
       SUM(CASE WHEN b.Status = 'Available'   THEN 1 ELSE 0 END) AS Available,
       COUNT(*) AS Total_Beds
FROM Hospital h
JOIN Bed b ON h.Hospital_ID = b.Hospital_ID
GROUP BY h.Hospital_ID, h.Hospital_Name;
