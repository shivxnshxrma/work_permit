import logging
import os
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from pypdf import PdfReader, PdfWriter


logger = logging.getLogger(__name__)

PDF_TEMPLATE_PATH = settings.BASE_DIR / 'apps' / 'templates' / 'pdf' / 'work_permit.pdf'

WORK_TYPE_CHECKBOXES = {
    'Hot work': 'checkbox_9slnx',
    'Excavation/Civil work': 'checkbox_10vvdc',
    'Pipeline work': 'checkbox_11xcsu',
    'Confined space entry': 'checkbox_12vjes',
    'Height work (1.8m+)': 'checkbox_13zhwy',
    'Electrical': 'checkbox_14lyow',
    'Emergency Machinery': 'checkbox_15exfq',
    'Others': 'checkbox_16cqfr',
}

FIRE_RISK_CHECKBOXES = {
    'fireA': 'checkbox_17bub',
    'fireB': 'checkbox_18xwzp',
    'fireC': 'checkbox_19hjti',
    'fireD': 'checkbox_20lqtp',
}

PPE_RADIO_GROUPS = {
    'Full Body Harness': ('radio_group_66blbc', '/Value_wem', '/Value_mzqw'),
    'Ear Plug': ('radio_group_68vvuo', '/Value_pezs', '/Value_hpwp'),
    'Goggle / Face shield': ('radio_group_70qehs', '/Value_gdtl', '/Value_ojxu'),
    'Dust Mask': ('radio_group_72xpwi', '/Value_jwuu', '/Value_aahd'),
    'Hand Gloves (Chemical/ Heat/ Cut resistant/ Cotton / Electrically insulated)': ('radio_group_74pfyr', '/Value_gsw', '/Value_druk'),
    'Apron & Leg Guard': ('radio_group_75cyoi', '/Value_sviv', '/Value_xsur'),
    'Heat Resistant suit': ('radio_group_76tpto', '/Value_kgxa', '/Value_wswy'),
    'Fitness Certificate': ('radio_group_77crsk', '/Value_riid', '/Value_kb'),
    'Any other (Pl. specify) 1.': ('radio_group_78yixm', '/Value_eeiq', '/Value_yspm'),
    'Any other (Pl. specify) 2.': ('radio_group_79qoik', '/Value_mkat', '/Value_eubq'),
}

HRA_RADIO_GROUPS = {
    'hra1': ('radio_group_48owfk', '/Value_acov', '/Value_qako'),
    'hra2': ('radio_group_50vegv', '/Value_yvnf', '/Value_fcsa'),
    'hra3': ('radio_group_52gjgj', '/Value_sgkv', '/Value_lfhd'),
}

DEFAULT_TEXT_FONT = '/Helvetica'
DEFAULT_TEXT_SIZE = 7
FIELD_FONT_SIZES = {
    'text_1ejpd': 5.5,
    'text_2ngnk': 5.5,
    'text_3zuxl': 5.5,
    'text_4upun': 5.5,
    'text_5fgwl': 5.5,
    'text_6ryop': 5.5,
    'text_7wzqo': 6.5,
    'text_8bruh': 6.5,
    'text_27npk': 6,
    'text_30axrq': 6,
    'text_31kzqf': 6,
    'text_35farn': 5.5,
    'text_36jelf': 5.5,
    'text_37auuq': 5.5,
    'text_38vunx': 5.5,
    'text_39cbaj': 5.5,
    'text_40cvth': 5.5,
    'text_41vwgh': 5.5,
    'text_42odpy': 5.5,
    'text_45fczg': 6,
    'text_46axtw': 6,
    'text_47yqbw': 6,
    'text_54udce': 6,
    'text_55noyl': 6,
    'text_56jiae': 6,
    'text_57dnqg': 6,
    'text_58tuch': 6,
    'text_59gvxu': 6,
    'text_60mcmy': 6,
    'text_61dgnx': 6,
    'text_62pfbd': 6,
    'text_63sazg': 6,
    'text_64bm': 6,
    'text_65zlat': 6,
    'text_87jjlf': 5.5,
    'text_88maqv': 6,
    'text_89irno': 6,
    'text_90fo': 6,
    'text_91geey': 6,
    'text_92wgxs': 6,
    'text_93xjyc': 6,
    'text_94xbel': 6,
    'text_95ffdu': 6,
    'text_96jayo': 6,
    'text_97lkvn': 6,
    'text_98ltpc': 6,
    'text_99zird': 6,
    'text_100bmwo': 6,
    'text_100fefy': 6,
    'text_101enpe': 6,
    'text_101ihmk': 6,
    'text_102cnqh': 6,
    'text_103eeyr': 6,
    'text_104vwjd': 6,
    'text_105viz': 6,
    'text_106lenv': 6,
    'text_107ecdr': 5,
}


def _date_text(value):
    if not value:
        return ''
    parts = str(value).split('-')
    if len(parts) == 3:
        return f'{parts[2]}/{parts[1]}/{parts[0]}'
    return str(value)


def _date_parts(value):
    if not value:
        return ('', '', '')
    parts = str(value).split('-')
    if len(parts) == 3:
        return (parts[2], parts[1], parts[0])
    return (str(value), '', '')


def _checkbox_value(checked):
    return '/Yes_ydso' if checked else '/Off'


def _radio_value(choice, yes_value, no_value):
    if choice == 'Yes':
        return yes_value
    if choice == 'No':
        return no_value
    return '/Off'


def _text_value(field_name, value):
    text = '' if value is None else str(value)
    return (text, DEFAULT_TEXT_FONT, FIELD_FONT_SIZES.get(field_name, DEFAULT_TEXT_SIZE))


def build_filled_permit_pdf(permit):
    if not PDF_TEMPLATE_PATH.exists():
        raise FileNotFoundError(f'PDF template not found at {PDF_TEMPLATE_PATH}')

    form_data = permit.form_data or {}
    reader = PdfReader(str(PDF_TEMPLATE_PATH))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.set_need_appearances_writer(True)

    valid_from_day, valid_from_month, valid_from_year = _date_parts(permit.valid_from)
    valid_to_day, valid_to_month, valid_to_year = _date_parts(permit.valid_to)

    text_fields = {
        'text_1ejpd': _text_value('text_1ejpd', valid_from_day),
        'text_2ngnk': _text_value('text_2ngnk', valid_from_month),
        'text_3zuxl': _text_value('text_3zuxl', valid_from_year),
        'text_4upun': _text_value('text_4upun', valid_to_day),
        'text_5fgwl': _text_value('text_5fgwl', valid_to_month),
        'text_6ryop': _text_value('text_6ryop', valid_to_year),
        'text_7wzqo': _text_value('text_7wzqo', permit.location or form_data.get('location', '')),
        'text_8bruh': _text_value('text_8bruh', permit.serial_number or form_data.get('sNo', '')),
        'text_99zird': _text_value('text_99zird', form_data.get('hazards', '')),
        'text_100fefy': _text_value('text_100fefy', form_data.get('empResp', '')),
        'text_101enpe': _text_value('text_101enpe', form_data.get('precautions', '')),
        'text_45fczg': _text_value('text_45fczg', form_data.get('trainName', '')),
        'text_46axtw': _text_value('text_46axtw', form_data.get('trainDesig', '')),
        'text_47yqbw': _text_value('text_47yqbw', form_data.get('trainDept', '')),
        'text_58tuch': _text_value('text_58tuch', form_data.get('initName', '')),
        'text_59gvxu': _text_value('text_59gvxu', form_data.get('hodUName', '')),
        'text_60mcmy': _text_value('text_60mcmy', form_data.get('ehsName', '')),
        'text_64bm': _text_value('text_64bm', form_data.get('hodFName', '')),
        'text_61dgnx': _text_value('text_61dgnx', _date_text(form_data.get('initDate', ''))),
        'text_62pfbd': _text_value('text_62pfbd', _date_text(form_data.get('hodUDate', ''))),
        'text_63sazg': _text_value('text_63sazg', _date_text(form_data.get('ehsDate', ''))),
        'text_65zlat': _text_value('text_65zlat', _date_text(form_data.get('hodFDate', ''))),
        'text_102cnqh': _text_value('text_102cnqh', form_data.get('legalName', '')),
        'text_27npk': _text_value('text_27npk', form_data.get('entrant', '')),
        'text_30axrq': _text_value('text_30axrq', form_data.get('attendant', '')),
        'text_31kzqf': _text_value('text_31kzqf', form_data.get('supervisor', '')),
        'text_103eeyr': _text_value('text_103eeyr', form_data.get('shiftHandover', '')),
        'text_104vwjd': _text_value('text_104vwjd', form_data.get('personsNotified', '')),
        'text_32ebsz': _text_value('text_32ebsz', form_data.get('coName', '')),
        'text_33niox': _text_value('text_33niox', form_data.get('contactPerson', '')),
        'text_34rkui': _text_value('text_34rkui', form_data.get('mobile', '')),
        'text_35farn': _text_value('text_35farn', _date_parts(form_data.get('startDate', ''))[0]),
        'text_36jelf': _text_value('text_36jelf', _date_parts(form_data.get('startDate', ''))[1]),
        'text_37auuq': _text_value('text_37auuq', _date_parts(form_data.get('startDate', ''))[2]),
        'text_40cvth': _text_value('text_40cvth', _date_parts(form_data.get('endDate', ''))[0]),
        'text_41vwgh': _text_value('text_41vwgh', _date_parts(form_data.get('endDate', ''))[1]),
        'text_42odpy': _text_value('text_42odpy', _date_parts(form_data.get('endDate', ''))[2]),
        'text_38vunx': _text_value('text_38vunx', form_data.get('shiftStart', '')),
        'text_39cbaj': _text_value('text_39cbaj', form_data.get('shiftEnd', '')),
        'text_87jjlf': _text_value('text_87jjlf', str(form_data.get('manpower', '') or '')),
        'text_105viz': _text_value('text_105viz', form_data.get('workDept', '')),
        'text_106lenv': _text_value('text_106lenv', form_data.get('exactLoc', '')),
        'text_90fo': _text_value('text_90fo', form_data.get('hraName', '')),
        'text_91geey': _text_value('text_91geey', _date_text(form_data.get('hraDate', ''))),
        'text_88maqv': _text_value('text_88maqv', form_data.get('ppeApprName', '')),
        'text_89irno': _text_value('text_89irno', _date_text(form_data.get('ppeApprDate', ''))),
        'text_54udce': _text_value('text_54udce', form_data.get('copyIssuedBy', '')),
        'text_55noyl': _text_value('text_55noyl', _date_text(form_data.get('issuedDate', ''))),
        'text_56jiae': _text_value('text_56jiae', form_data.get('conName', '')),
        'text_57dnqg': _text_value('text_57dnqg', _date_text(form_data.get('conDate', ''))),
        'text_92wgxs': _text_value('text_92wgxs', form_data.get('repName', '')),
        'text_93xjyc': _text_value('text_93xjyc', _date_text(form_data.get('repDate', ''))),
        'text_94xbel': _text_value('text_94xbel', form_data.get('cmpContractor', '')),
        'text_95ffdu': _text_value('text_95ffdu', form_data.get('cmpSiteIncharge', '')),
        'text_96jayo': _text_value('text_96jayo', form_data.get('cmpPersonIssuing', '')),
        'text_97lkvn': _text_value('text_97lkvn', form_data.get('cmpPersonIssuing', '')),
        'text_98ltpc': _text_value('text_98ltpc', form_data.get('ppeOtherSpec1', '')),
        'text_100bmwo': _text_value('text_100bmwo', form_data.get('ppeOtherSpec2', '')),
        'text_101ihmk': _text_value('text_101ihmk', form_data.get('ppeOtherSpec2', '')),
        'text_107ecdr': _text_value('text_107ecdr', form_data.get('precautions', '')),
    }

    button_fields = {}
    selected_work_types = set(form_data.get('workTypes', []))
    for work_type, field_name in WORK_TYPE_CHECKBOXES.items():
        button_fields[field_name] = _checkbox_value(work_type in selected_work_types)

    for form_key, field_name in FIRE_RISK_CHECKBOXES.items():
        button_fields[field_name] = _checkbox_value(bool(form_data.get(form_key)))

    for form_key, (field_name, yes_value, no_value) in HRA_RADIO_GROUPS.items():
        button_fields[field_name] = _radio_value(form_data.get(form_key), yes_value, no_value)

    ppe_values = form_data.get('ppe', {})
    for ppe_key, (field_name, yes_value, no_value) in PPE_RADIO_GROUPS.items():
        button_fields[field_name] = _radio_value(ppe_values.get(ppe_key), yes_value, no_value)

    merged_fields = {**text_fields, **button_fields}
    for page in writer.pages:
        writer.update_page_form_field_values(
            page,
            merged_fields,
            auto_regenerate=True,
            flatten=True,
        )

    # Remove widget annotations after flattening so all values remain visible
    # in PDF viewers that do not honor interactive form appearances.
    writer.remove_annotations(['/Widget'])
    writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def attach_permit_pdf(permit):
    pdf_bytes = build_filled_permit_pdf(permit)
    filename = f"{(permit.serial_number or f'permit-{permit.pk}').replace('/', '-')}.pdf"
    permit.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
    return permit


def send_final_permit_email(permit):
    """Email the approved permit PDF to the configured recipient, if any."""
    recipient = getattr(settings, 'FINAL_PERMIT_EMAIL', '') or os.getenv('FINAL_PERMIT_EMAIL', '')
    if not recipient:
        logger.info('Skipping final permit email for permit %s because FINAL_PERMIT_EMAIL is not configured.', permit.pk)
        return False

    if not permit.pdf_file:
        logger.warning('Skipping final permit email for permit %s because no PDF is attached.', permit.pk)
        return False

    email = EmailMessage(
        subject=f'Approved Work Permit #{permit.serial_number or permit.pk}',
        body=(
            f'The attached work permit has completed all approval stages.\n\n'
            f'Permit ID: {permit.pk}\n'
            f'Serial Number: {permit.serial_number or "N/A"}\n'
            f'Employee: {permit.user.full_name} <{permit.user.email}>'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )

    permit.pdf_file.open('rb')
    try:
        email.attach(
            permit.pdf_file.name.rsplit('/', 1)[-1] or f'permit_{permit.pk}.pdf',
            permit.pdf_file.read(),
            'application/pdf',
        )
    finally:
        permit.pdf_file.close()

    email.send(fail_silently=False)
    return True
