from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register,   name='auth-register'),
    path('login/',    views.LoginView.as_view(), name='auth-login'),
    path('refresh/',  views.CookieTokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/',   views.logout,     name='auth-logout'),
    path('me/',       views.me,         name='auth-me'),
    path('users/',    views.users,      name='auth-users'),
    path('forgot-password/', views.forgot_password, name='auth-forgot-password'),
    path('reset-password/',  views.reset_password,  name='auth-reset-password'),
]
