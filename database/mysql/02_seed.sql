-- ============================================================
-- 02_seed.sql  —  Sample data (DML INSERT)
-- Run AFTER 01_schema.sql
-- IDs chosen to line up with the MongoDB seed:
--   Patients 1-5, Doctors incl. 5 & 7, Lab_Tests 1-3, Appointments 1-3
-- ============================================================
USE MultiHospitalHealthcare;

-- ---------- HOSPITAL ----------
INSERT INTO Hospital (Hospital_ID, Hospital_Name, Address, Phone, Email) VALUES
(1,'City General Hospital','MG Road, Bengaluru','08041110000','contact@citygen.in'),
(2,'Sunrise Multispeciality','Whitefield, Bengaluru','08042220000','info@sunrise.in');

-- ---------- DEPARTMENT ----------
INSERT INTO Department (Department_ID, Hospital_ID, Department_Name, Location) VALUES
(1,1,'Cardiology','Block A, Floor 2'),
(2,1,'Neurology','Block A, Floor 3'),
(3,1,'General Medicine','Block B, Floor 1'),
(4,2,'Cardiology','Tower 1, Floor 4'),
(5,2,'Orthopedics','Tower 2, Floor 2');

-- ---------- DOCTOR (IDs 1-7; app logins use 5 and 7) ----------
INSERT INTO Doctor (Doctor_ID, Department_ID, Doctor_Name, Specialization, Phone, Email, License_No, Experience_Years) VALUES
(1,1,'Dr. Anil Kumar','Cardiologist','09900000001','anil.k@citygen.in','KA-CARD-1001',12),
(2,2,'Dr. Sowmya Nair','Neurologist','09900000002','sowmya.n@citygen.in','KA-NEUR-1002',9),
(3,3,'Dr. Imran Shaikh','General Physician','09900000003','imran.s@citygen.in','KA-GEN-1003',6),
(4,4,'Dr. Lakshmi Rao','Cardiologist','09900000004','lakshmi.r@sunrise.in','KA-CARD-1004',15),
(5,2,'Dr. Rohit Mehta','Neurologist','09900000005','rohit.m@citygen.in','KA-NEUR-1005',11),
(6,5,'Dr. Fatima Ali','Orthopedic Surgeon','09900000006','fatima.a@sunrise.in','KA-ORTH-1006',8),
(7,1,'Dr. Suresh Rao','Cardiologist','09900000007','suresh.r@citygen.in','KA-CARD-1007',14);

-- ---------- NURSE ----------
INSERT INTO Nurse (Nurse_ID, Department_ID, Nurse_Name, Phone, Qualification) VALUES
(1,1,'Nurse Meena','09811111111','B.Sc Nursing'),
(2,3,'Nurse Joseph','09822222222','GNM'),
(3,2,'Nurse Kavya','09833333333','B.Sc Nursing');

-- ---------- STAFF ----------
INSERT INTO Staff (Staff_ID, Hospital_ID, Staff_Name, Role, Phone, Email) VALUES
(1,1,'Ramesh Gupta','Receptionist','09844444444','ramesh.g@citygen.in'),
(12,1,'Deepa Shetty','Lab Technician','09855555555','deepa.s@citygen.in'),
(3,2,'Arjun Dev','Billing Clerk','09866666666','arjun.d@sunrise.in');

-- ---------- BED ----------
INSERT INTO Bed (Bed_ID, Hospital_ID, Department_ID, Bed_Number, Ward_Type, Status) VALUES
(1,1,1,'A-201','ICU','Occupied'),   -- Priya (Admission 1) is in this bed; triggers don't exist yet at seed time
(2,1,1,'A-202','ICU','Available'),
(3,1,3,'B-101','General','Available'),
(4,1,3,'B-102','General','Available'),
(5,2,5,'T2-050','Private','Maintenance');

-- ---------- PATIENT ----------
INSERT INTO Patient (Patient_ID, Patient_Name, Date_of_Birth, Gender, Blood_Group, Phone, Email, Address) VALUES
(1,'Rajesh Reddy','1990-05-14','Male','O+','09700000001','rajesh.r@example.com','Jayanagar, Bengaluru'),
(2,'Priya Sharma','1985-11-02','Female','A+','09700000002','priya.s@example.com','Indiranagar, Bengaluru'),
(3,'Amit Verma','2001-03-21','Male','B+','09700000003','amit.v@example.com','BTM Layout, Bengaluru'),
(4,'Sneha Iyer','1978-07-30','Female','AB+','09700000004','sneha.i@example.com','HSR Layout, Bengaluru'),
(5,'Vikram Singh','1995-01-09','Male','O-','09700000005','vikram.s@example.com','Koramangala, Bengaluru');

-- ---------- EMERGENCY_CONTACT (multivalued) ----------
INSERT INTO Emergency_Contact (Patient_ID, Contact_Number) VALUES
(1,'09710000011'),(1,'09710000012'),
(2,'09710000021'),
(3,'09710000031');

-- ---------- APPOINTMENT (IDs 1-3 match MongoDB clinical_notes) ----------
INSERT INTO Appointment (Appointment_ID, Patient_ID, Doctor_ID, Appointment_DateTime, Appointment_Status, Reason) VALUES
(1,1,5,'2026-10-20 09:00:00','Completed','Fatigue and dizziness'),
(2,2,7,'2026-10-21 13:30:00','Completed','Breathlessness on exertion'),
(3,1,5,'2026-10-27 10:15:00','Scheduled','Follow-up for anemia'),
(4,3,3,'2026-10-28 11:00:00','Scheduled','Fever and cold'),
(5,4,4,'2026-10-29 15:00:00','Scheduled','Chest pain review');

-- ---------- MEDICINE ----------
INSERT INTO Medicine (Medicine_ID, Medicine_Name, Manufacturer, Unit_Price, Stock_Quantity) VALUES
(1,'Paracetamol 500mg','Cipla',2.50,500),
(2,'Iron + Folic Acid','Sun Pharma',4.00,300),
(3,'Aspirin 75mg','Dr Reddy''s',1.75,400),
(4,'Amoxicillin 500mg','Cipla',6.50,150),
(5,'Atorvastatin 10mg','Sun Pharma',8.00,200);

-- ---------- PRESCRIPTION ----------
INSERT INTO Prescription (Prescription_ID, Patient_ID, Doctor_ID, Prescription_Date, Notes) VALUES
(1,1,5,'2026-10-20','Start iron supplementation, review in 1 week'),
(2,2,7,'2026-10-21','Cardiac workup; start low-dose aspirin');

-- ---------- PRESCRIPTION_MEDICINE (M:N) ----------
INSERT INTO Prescription_Medicine (Prescription_ID, Medicine_ID, Dosage, Frequency, Duration_Days) VALUES
(1,2,'1 tablet','Once daily',30),
(1,1,'1 tablet','As needed',5),
(2,3,'1 tablet','Once daily',90),
(2,5,'1 tablet','At night',90);

-- ---------- LAB_TEST (IDs 1-3 match MongoDB medical_reports) ----------
INSERT INTO Lab_Test (Test_ID, Patient_ID, Doctor_ID, Test_Name, Test_Date, Test_Status) VALUES
(1,1,5,'Complete Blood Count','2026-10-20 09:30:00','Completed'),
(2,2,7,'Chest X-Ray','2026-10-21 14:10:00','Completed'),
(3,1,5,'MRI Brain','2026-10-24 11:00:00','Ordered');

-- ---------- LAB_REPORT (1:1) ----------
INSERT INTO Lab_Report (Report_ID, Test_ID, Report_Date, Result_Summary, Normal_Range) VALUES
(1,1,'2026-10-20 15:00:00','Hemoglobin 11.2 g/dL (low); WBC and platelets normal. Suggestive of mild anemia.','Hb 13-17 g/dL'),
(2,2,'2026-10-21 17:30:00','No active lung lesion. Mild cardiomegaly observed.','N/A');

-- ---------- ADMISSION ----------
INSERT INTO Admission (Admission_ID, Patient_ID, Bed_ID, Admitting_Doctor_ID, Admission_Date, Discharge_Date, Diagnosis, Admission_Status) VALUES
(1,2,1,7,'2026-10-21 18:00:00',NULL,'Observation for suspected cardiac issue','Admitted'),
(2,4,3,4,'2026-10-15 10:00:00','2026-10-18 12:00:00','Stable angina, managed','Discharged');

-- ---------- INSURANCE ----------
INSERT INTO Insurance (Insurance_ID, Patient_ID, Provider_Name, Policy_Number, Coverage_Amount, Start_Date, End_Date) VALUES
(1,1,'Star Health','STAR-2026-0001',200000.00,'2026-01-01','2026-12-31'),
(2,2,'HDFC Ergo','HDFC-2026-0002',500000.00,'2026-04-01','2027-03-31');

-- ---------- PAYMENT ----------
INSERT INTO Payment (Payment_ID, Patient_ID, Admission_ID, Insurance_ID, Amount, Payment_Date, Payment_Method, Payment_Status) VALUES
(1,2,1,2,15000.00,'2026-10-21 19:00:00','Card','Pending'),
(2,4,2,NULL,22000.00,'2026-10-18 13:00:00','UPI','Paid'),
(3,1,NULL,1,1200.00,'2026-10-20 16:00:00','Cash','Paid');

-- ---------- APP_USER (bcrypt-hashed passwords; 3 roles: Admin, Doctor, Patient) ----------
-- Demo credentials (plaintext shown here ONLY for your testing — see README):
--   admin           / Admin@123     (Admin)
--   dr_mehta        / Doctor@123    (Doctor 5)
--   dr_rao          / Doctor@123    (Doctor 7)
--   patient_rajesh  / Patient@123   (Patient 1)
--   patient_priya   / Patient@123   (Patient 2)
INSERT INTO App_User (Username, Password_Hash, Role, Patient_ID, Doctor_ID) VALUES
('admin','$2b$10$oQ4/XonFxC1.xF6vziKRJ.qWbqdcjoAKj.quCUjf1XggXmKoPdlLW','Admin',NULL,NULL),
('dr_mehta','$2b$10$E1ST/pIISjeEapAOB8pG7O3RUcv3IwihxyI5Sy2NVMlofcu9KC5Uq','Doctor',NULL,5),
('dr_rao','$2b$10$S5Q/fcpzKeoDMTiWpFDD8OMIgPeDuJ7Ydmm1lIA9YQZL.yVb22RVm','Doctor',NULL,7),
('patient_rajesh','$2b$10$qcdjlBP4.3C4F5YT7yoL8.NiLsBxxmpyXHTPfCXLrnhvxn4VhgxNS','Patient',1,NULL),
('patient_priya','$2b$10$PDLbiR/fY90J4A4G6CAK9.odK.2g9qt63A9wJO3WcFpmOzVgxrqY6','Patient',2,NULL);
