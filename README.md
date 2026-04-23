PrescriptionDatabase

users table

UserID   		INT(11) PK
UserName		VARCHAR(50)

Medications table

MedID    		INT(11) PK
Name			VARCHAR(50)

Prescriptions table

PrescriptionID  INT(11) PK
UserID    		INT(11) FK
MedID   		INT(11) FK
Dosage  		VARCHAR(50)
Frequency  		VARCHAR(50)
Doctor			VARCHAR(50)
Active			Boolean




Api

AddUser
GetUsers
GetPrescriptionsList
GetPrescriptions
AddMed
DeletePrescription
ModifyPrescription
ListMeds
AddPrescriptition

