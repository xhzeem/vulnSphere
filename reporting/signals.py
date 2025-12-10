from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import VulnerabilityAsset, ReportAsset


@receiver(post_save, sender=VulnerabilityAsset)
def auto_attach_asset_to_report(sender, instance, created, **kwargs):
    """
    Automatically attach assets to reports when a vulnerability references them.
    """
    if created:
        # Create ReportAsset if it doesn't exist
        ReportAsset.objects.get_or_create(
            report=instance.vulnerability.report,
            asset=instance.asset,
            defaults={'auto_attached': True}
        )
