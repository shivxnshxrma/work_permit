from django.urls import path
from . import views, admin_views, approver_views

urlpatterns = [
    # Employee endpoints
    path('next-serial/',                views.next_serial_number,       name='permit-next-serial'),
    path('',                           views.permit_list,               name='permit-list'),
    path('create/',                    views.permit_create,             name='permit-create'),
    path('<int:pk>/',                  views.permit_detail,             name='permit-detail'),
    path('<int:pk>/download/',         views.permit_download,           name='permit-download'),
    path('<int:pk>/submit/',           views.permit_submit_for_approval, name='permit-submit'),

    # Admin endpoints
    path('admin/login/',               admin_views.admin_login,          name='admin-login'),
    path('admin/approvers/',           admin_views.approvers_list_create, name='admin-approvers'),
    path('admin/approvers/<int:approver_id>/', admin_views.approver_delete, name='admin-approver-delete'),
    path('admin/dashboard/',           admin_views.admin_dashboard,     name='admin-dashboard'),
    path('admin/permits/',             admin_views.admin_permit_list,   name='admin-permit-list'),
    path('admin/permits/<int:pk>/',    admin_views.admin_permit_detail, name='admin-permit-detail'),
    path('admin/permits/<int:pk>/download/', admin_views.admin_permit_download, name='admin-permit-download'),

    # Approver endpoints
    path('approvals/summary/',         approver_views.approver_summary, name='approver-summary'),
    path('approvals/signature/',       approver_views.approver_signature, name='approver-signature'),
    path('approvals/pending/',         approver_views.approver_permits, name='approver-permits'),
    path('approvals/<int:pk>/',        approver_views.approver_permit_detail, name='approver-permit-detail'),
    path('approvals/<int:pk>/approve/', approver_views.approve_permit,  name='approve-permit'),
    path('approvals/<int:pk>/reject/',  approver_views.reject_permit,   name='reject-permit'),
]
