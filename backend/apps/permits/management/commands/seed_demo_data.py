from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.permits.models import ApprovalLog, Approver, WorkPermit


DEMO_PASSWORD = 'DemoPass@123'

MINIMAL_PDF_BYTES = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 40 80 Td (Demo Work Permit PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000208 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
302
%%EOF
"""


class Command(BaseCommand):
    help = 'Seed the database with demo users, approvers, permits, and approval logs.'

    def handle(self, *args, **options):
        with transaction.atomic():
            admin = self._ensure_user(
                email='admin@dsgroup.com',
                username='admin',
                first_name='Super',
                last_name='Admin',
                department='Administration',
                employee_id='ADM-000',
                phone='9999999999',
            )
            Approver.objects.update_or_create(user=admin, stage=1, defaults={'is_admin': True})

            stage_1_users = [
                self._ensure_user(
                    email='stage1.approver1@dsgroup.com',
                    username='stage1approver1',
                    first_name='Amit',
                    last_name='Khanna',
                    department='Safety',
                    employee_id='APR-S1-001',
                    phone='9000000001',
                ),
                self._ensure_user(
                    email='stage1.approver2@dsgroup.com',
                    username='stage1approver2',
                    first_name='Neha',
                    last_name='Saxena',
                    department='Operations',
                    employee_id='APR-S1-002',
                    phone='9000000002',
                ),
                self._ensure_user(
                    email='stage1.approver3@dsgroup.com',
                    username='stage1approver3',
                    first_name='Ravi',
                    last_name='Menon',
                    department='Production',
                    employee_id='APR-S1-003',
                    phone='9000000003',
                ),
            ]

            stage_2_users = [
                self._ensure_user(
                    email='stage2.approver1@dsgroup.com',
                    username='stage2approver1',
                    first_name='Pooja',
                    last_name='Nair',
                    department='EHS',
                    employee_id='APR-S2-001',
                    phone='9000000011',
                ),
                self._ensure_user(
                    email='stage2.approver2@dsgroup.com',
                    username='stage2approver2',
                    first_name='Harsh',
                    last_name='Arora',
                    department='Engineering',
                    employee_id='APR-S2-002',
                    phone='9000000012',
                ),
                self._ensure_user(
                    email='stage2.approver3@dsgroup.com',
                    username='stage2approver3',
                    first_name='Sonal',
                    last_name='Jain',
                    department='Plant Head Office',
                    employee_id='APR-S2-003',
                    phone='9000000013',
                ),
            ]

            for user in stage_1_users:
                Approver.objects.update_or_create(user=user, stage=1, defaults={'is_admin': False})
            for index, user in enumerate(stage_2_users, start=1):
                Approver.objects.update_or_create(
                    user=user,
                    stage=2,
                    defaults={
                        'is_admin': False,
                        'requires_reason_on_approval': index == 1,
                    },
                )

            employees = [
                self._ensure_user(
                    email='employee1@dsgroup.com',
                    username='employee1',
                    first_name='Rahul',
                    last_name='Verma',
                    department='Utilities',
                    employee_id='EMP-001',
                    phone='9100000001',
                ),
                self._ensure_user(
                    email='employee2@dsgroup.com',
                    username='employee2',
                    first_name='Priya',
                    last_name='Sharma',
                    department='Maintenance',
                    employee_id='EMP-002',
                    phone='9100000002',
                ),
                self._ensure_user(
                    email='employee3@dsgroup.com',
                    username='employee3',
                    first_name='Karan',
                    last_name='Singh',
                    department='Projects',
                    employee_id='EMP-003',
                    phone='9100000003',
                ),
            ]

            today = date.today()
            permits = [
                self._upsert_permit(
                    employee=employees[0],
                    serial='WP-DEMO-001',
                    location='Boiler House - Level 1',
                    valid_from=today,
                    valid_to=today + timedelta(days=1),
                    status=WorkPermit.Status.STAGE_1,
                    current_stage=1,
                    form_data=self._build_form_data('WP-DEMO-001', 'Boiler House - Level 1', employees[0]),
                    rejection_reason='',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[0],
                    serial='WP-DEMO-002',
                    location='Packing Line - Zone B',
                    valid_from=today - timedelta(days=1),
                    valid_to=today + timedelta(days=2),
                    status=WorkPermit.Status.STAGE_1,
                    current_stage=1,
                    form_data=self._build_form_data('WP-DEMO-002', 'Packing Line - Zone B', employees[0]),
                    rejection_reason='',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[1],
                    serial='WP-DEMO-003',
                    location='Utility Tunnel - South Wing',
                    valid_from=today - timedelta(days=2),
                    valid_to=today + timedelta(days=2),
                    status=WorkPermit.Status.STAGE_2,
                    current_stage=2,
                    form_data=self._build_form_data('WP-DEMO-003', 'Utility Tunnel - South Wing', employees[1]),
                    rejection_reason='',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[1],
                    serial='WP-DEMO-004',
                    location='Warehouse Roof Access',
                    valid_from=today - timedelta(days=5),
                    valid_to=today - timedelta(days=4),
                    status=WorkPermit.Status.STAGE_1_REJECTED,
                    current_stage=0,
                    form_data=self._build_form_data('WP-DEMO-004', 'Warehouse Roof Access', employees[1]),
                    rejection_reason='Incomplete fall protection plan for roof work.',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[2],
                    serial='WP-DEMO-005',
                    location='ETP Pump Room',
                    valid_from=today - timedelta(days=7),
                    valid_to=today - timedelta(days=5),
                    status=WorkPermit.Status.STAGE_2_REJECTED,
                    current_stage=0,
                    form_data=self._build_form_data('WP-DEMO-005', 'ETP Pump Room', employees[2]),
                    rejection_reason='Gas test report was missing for confined space entry.',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[2],
                    serial='WP-DEMO-006',
                    location='Cooling Tower Platform',
                    valid_from=today - timedelta(days=10),
                    valid_to=today - timedelta(days=8),
                    status=WorkPermit.Status.APPROVED,
                    current_stage=3,
                    form_data=self._build_form_data('WP-DEMO-006', 'Cooling Tower Platform', employees[2]),
                    rejection_reason='',
                    attach_pdf=True,
                ),
                self._upsert_permit(
                    employee=employees[0],
                    serial='WP-DEMO-007',
                    location='Admin Block HVAC Duct',
                    valid_from=today - timedelta(days=3),
                    valid_to=today - timedelta(days=2),
                    status=WorkPermit.Status.CANCELLED,
                    current_stage=0,
                    form_data=self._build_form_data('WP-DEMO-007', 'Admin Block HVAC Duct', employees[0]),
                    rejection_reason='',
                    attach_pdf=True,
                ),
            ]

            self._sync_logs(permits, stage_1_users, stage_2_users)

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully.'))
        self.stdout.write(
            'Demo credentials:\n'
            f'  Employee: employee1@dsgroup.com / {DEMO_PASSWORD}\n'
            f'  Employee: employee2@dsgroup.com / {DEMO_PASSWORD}\n'
            f'  Employee: employee3@dsgroup.com / {DEMO_PASSWORD}\n'
            f'  Stage 1 Approver: stage1.approver1@dsgroup.com / {DEMO_PASSWORD}\n'
            f'  Stage 2 Approver: stage2.approver1@dsgroup.com / {DEMO_PASSWORD}\n'
            f'  Super Admin: admin@dsgroup.com / SuperAdmin@123'
        )

    def _ensure_user(self, **user_fields):
        email = user_fields['email']
        defaults = {
            key: value
            for key, value in user_fields.items()
            if key != 'email'
        }
        user, created = User.objects.get_or_create(email=email, defaults=defaults)
        if not created:
            for field, value in defaults.items():
                setattr(user, field, value)
        user.set_password(DEMO_PASSWORD if email != 'admin@dsgroup.com' else 'SuperAdmin@123')
        user.save()
        return user

    def _upsert_permit(self, *, employee, serial, location, valid_from, valid_to, status, current_stage, form_data, rejection_reason, attach_pdf):
        permit, _ = WorkPermit.objects.update_or_create(
            serial_number=serial,
            defaults={
                'user': employee,
                'location': location,
                'valid_from': valid_from,
                'valid_to': valid_to,
                'status': status,
                'current_stage': current_stage,
                'form_data': form_data,
                'rejection_reason': rejection_reason,
            },
        )

        if attach_pdf and not permit.pdf_file:
            permit.pdf_file.save(f'{serial.lower()}.pdf', ContentFile(MINIMAL_PDF_BYTES), save=True)
        return permit

    def _build_form_data(self, serial, location, employee):
        today = date.today()
        return {
            'validFrom': today.isoformat(),
            'validTo': (today + timedelta(days=1)).isoformat(),
            'sNo': serial,
            'location': location,
            'workTypes': ['Hot work', 'Height work (1.8m+)', 'Electrical'],
            'hazards': 'Hot surfaces, overhead work, and nearby energized equipment.',
            'precautions': 'Barricading, gas check, fire extinguisher, standby attendant, and PPE compliance.',
            'empResp': employee.full_name,
            'coName': 'Demo Industrial Contractors Pvt Ltd',
            'contactPerson': 'Mahesh Contractor',
            'mobile': '9876543210',
            'startDate': today.isoformat(),
            'endDate': (today + timedelta(days=1)).isoformat(),
            'shiftStart': '08:00',
            'shiftEnd': '17:00',
            'manpower': '6',
            'workDept': employee.department,
            'exactLoc': location,
            'hra1': 'Yes',
            'hra2': 'Yes',
            'hra3': 'Yes',
            'hraName': 'HRA Officer',
            'hraDate': today.isoformat(),
            'initName': employee.full_name,
            'initDate': today.isoformat(),
            'hodUName': 'User Department HOD',
            'hodUDate': today.isoformat(),
            'ehsName': 'EHS Reviewer',
            'ehsDate': today.isoformat(),
            'hodFName': 'Facility Head',
            'hodFDate': today.isoformat(),
            'ppe': {
                'Full Body Harness': 'Yes',
                'Ear Plug': 'No',
                'Goggle / Face shield': 'Yes',
                'Dust Mask': 'Yes',
                'Hand Gloves (Chemical/ Heat/ Cut resistant/ Cotton / Electrically insulated)': 'Yes',
                'Apron & Leg Guard': 'No',
                'Heat Resistant suit': 'No',
                'Fitness Certificate': 'Yes',
            },
        }

    def _sync_logs(self, permits, stage_1_users, stage_2_users):
        permit_map = {permit.serial_number: permit for permit in permits}

        log_specs = {
            'WP-DEMO-003': [
                (stage_1_users[0], 1, 'approved', 'Stage 1 checks completed.'),
            ],
            'WP-DEMO-004': [
                (stage_1_users[1], 1, 'rejected', 'Incomplete fall protection plan for roof work.'),
            ],
            'WP-DEMO-005': [
                (stage_1_users[2], 1, 'approved', 'Safe to move to Stage 2 review.'),
                (stage_2_users[0], 2, 'rejected', 'Gas test report was missing for confined space entry.'),
            ],
            'WP-DEMO-006': [
                (stage_1_users[0], 1, 'approved', 'Stage 1 approved after toolbox talk verification.'),
                (stage_2_users[1], 2, 'approved', 'Final approval completed by EHS and plant management.'),
            ],
        }

        for serial, specs in log_specs.items():
            permit = permit_map[serial]
            ApprovalLog.objects.filter(permit=permit).delete()
            timestamp = timezone.now() - timedelta(days=2)
            for approver, stage, action, reason in specs:
                log = ApprovalLog.objects.create(
                    permit=permit,
                    approver=approver,
                    stage=stage,
                    action=action,
                    reason=reason,
                )
                ApprovalLog.objects.filter(pk=log.pk).update(created_at=timestamp)
                timestamp += timedelta(hours=6)
