from django.apps import AppConfig


class ReportingConfig(AppConfig):
    name = 'reporting'
    
    def ready(self):
        import reporting.signals  # noqa
