import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '@modules/identity/services/users.service';
import {
  BookingLifecycleEventPayload,
  DomainEvents,
  ListingModerationEventPayload,
  ProviderRejectedEventPayload,
  ProviderVerificationEventPayload,
  VerificationDocumentReviewedEventPayload,
} from '@common/events/domain-events';
import { NotificationsService } from '../services/notifications.service';
import { NotificationType } from '../enums/notification-type.enum';

interface EmailContent {
  subject: string;
  body: string;
}

/**
 * The listener side of the domain-event bus Booking/Identity/Catalog emit
 * into after their own transactions resolve (see each emit call site's own
 * doc comments). Never imports BookingModule -- every payload already
 * carries the recipient id plus whatever display text (a listing title, a
 * business name) the emitting call site had on hand; the only lookup this
 * class does itself is resolving a recipient's email via Identity's own
 * exported UsersService, for the subset of events worth emailing.
 *
 * NotificationType is coarser than these domain event names in a couple of
 * places (no separate "dispute resolved" or per-outcome extension types) --
 * intentional, since adding either would need a migration for the native
 * Postgres enum column backing Notification.type for a purely cosmetic
 * distinction. The event payload itself still carries the real specifics
 * (reason, finalDeductionMinor, requestedEndsAt) for the frontend to render.
 */
@Injectable()
export class DomainEventsListener {
  private readonly logger = new Logger(DomainEventsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent(DomainEvents.BookingCreated)
  async onBookingCreated(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_CREATED, payload, {
      subject: `New booking request — ${payload.listingTitle}`,
      body: `You've received a new booking request for "${payload.listingTitle}". Log in to your Rently dashboard to approve or decline it.`,
    });
  }

  @OnEvent(DomainEvents.BookingApproved)
  async onBookingApproved(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_APPROVED, payload, {
      subject: `Booking approved — ${payload.listingTitle}`,
      body: `Good news — your booking for "${payload.listingTitle}" has been approved. Log in to Rently for pickup details.`,
    });
  }

  @OnEvent(DomainEvents.BookingDeclined)
  async onBookingDeclined(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_DECLINED, payload, {
      subject: `Booking declined — ${payload.listingTitle}`,
      body: `Unfortunately, your booking request for "${payload.listingTitle}" was declined.${this.reasonSuffix(payload.reason)}`,
    });
  }

  @OnEvent(DomainEvents.BookingCancelled)
  async onBookingCancelled(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_CANCELLED, payload, {
      subject: `Booking cancelled — ${payload.listingTitle}`,
      body: `The booking for "${payload.listingTitle}" has been cancelled.${this.reasonSuffix(payload.reason)}`,
    });
  }

  @OnEvent(DomainEvents.BookingHandedOver)
  async onBookingHandedOver(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_HANDED_OVER, payload);
  }

  @OnEvent(DomainEvents.BookingReturned)
  async onBookingReturned(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_RETURNED, payload);
  }

  @OnEvent(DomainEvents.BookingDepositReleased)
  async onBookingDepositReleased(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_DEPOSIT_RELEASED, payload);
  }

  @OnEvent(DomainEvents.BookingDisputed)
  async onBookingDisputed(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_DISPUTED, payload, {
      subject: `A dispute was opened — ${payload.listingTitle}`,
      body: `The provider reported an issue with your rental of "${payload.listingTitle}" and opened a dispute. Log in to Rently to see the details and respond.`,
    });
  }

  @OnEvent(DomainEvents.BookingDisputeResolved)
  async onBookingDisputeResolved(payload: BookingLifecycleEventPayload) {
    const deduction = payload.finalDeductionMinor ?? 0;
    const deductionLine =
      deduction > 0
        ? `₦${(deduction / 100).toLocaleString()} was deducted from your deposit.`
        : 'Your full deposit was released — no deduction.';
    await this.deliver(payload.recipientId, NotificationType.BOOKING_DISPUTED, payload, {
      subject: `Dispute resolved — ${payload.listingTitle}`,
      body: `The dispute over your rental of "${payload.listingTitle}" has been resolved. ${deductionLine}`,
    });
  }

  @OnEvent(DomainEvents.BookingExtensionRequested)
  async onBookingExtensionRequested(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_EXTENSION_REQUESTED, payload, {
      subject: `Extension requested — ${payload.listingTitle}`,
      body: `The renter of "${payload.listingTitle}" has requested to extend their rental${payload.requestedEndsAt ? ` to ${new Date(payload.requestedEndsAt).toLocaleString()}` : ''}. Log in to Rently to approve or decline it.`,
    });
  }

  @OnEvent(DomainEvents.BookingExtensionApproved)
  async onBookingExtensionApproved(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_EXTENSION_RESOLVED, payload, {
      subject: `Extension approved — ${payload.listingTitle}`,
      body: `Your request to extend "${payload.listingTitle}"${payload.requestedEndsAt ? ` to ${new Date(payload.requestedEndsAt).toLocaleString()}` : ''} was approved.`,
    });
  }

  @OnEvent(DomainEvents.BookingExtensionDeclined)
  async onBookingExtensionDeclined(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_EXTENSION_RESOLVED, payload, {
      subject: `Extension declined — ${payload.listingTitle}`,
      body: `Your request to extend "${payload.listingTitle}" was declined.${this.reasonSuffix(payload.reason)}`,
    });
  }

  @OnEvent(DomainEvents.BookingExtensionCancelled)
  async onBookingExtensionCancelled(payload: BookingLifecycleEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.BOOKING_EXTENSION_RESOLVED, payload);
  }

  @OnEvent(DomainEvents.ProviderVerified)
  async onProviderVerified(payload: ProviderVerificationEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.PROVIDER_VERIFIED, payload, {
      subject: 'Your provider account is verified',
      body: `Congratulations${payload.businessName ? `, ${payload.businessName}` : ''} — your provider account has been verified. You can now start listing on Rently.`,
    });
  }

  @OnEvent(DomainEvents.ProviderRejected)
  async onProviderRejected(payload: ProviderRejectedEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.PROVIDER_REJECTED, payload, {
      subject: 'Your provider verification was not approved',
      body: `Your provider verification could not be approved. Reason: ${payload.reason}. You can update your details and resubmit.`,
    });
  }

  @OnEvent(DomainEvents.ListingApproved)
  async onListingApproved(payload: ListingModerationEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.LISTING_APPROVED, payload, {
      subject: `Listing approved — ${payload.listingTitle}`,
      body: `Your listing "${payload.listingTitle}" is now live and bookable on Rently.`,
    });
  }

  @OnEvent(DomainEvents.ListingRejected)
  async onListingRejected(payload: ListingModerationEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.LISTING_REJECTED, payload, {
      subject: `Listing rejected — ${payload.listingTitle}`,
      body: `Your listing "${payload.listingTitle}" was not approved. Log in to Rently to review and resubmit it.`,
    });
  }

  @OnEvent(DomainEvents.VerificationDocumentReviewed)
  async onVerificationDocumentReviewed(payload: VerificationDocumentReviewedEventPayload) {
    await this.deliver(payload.recipientId, NotificationType.VERIFICATION_DOCUMENT_REVIEWED, payload);
  }

  private reasonSuffix(reason?: string | null): string {
    return reason ? ` Reason: ${reason}` : '';
  }

  /**
   * Always writes the in-app row; additionally emails when `email` is
   * given AND the recipient has an address on file (phone-only accounts
   * just get the in-app notification). Never throws -- a listener running
   * detached from EventEmitter2's synchronous emit() would otherwise
   * surface as an unhandled rejection instead of a normal log line.
   */
  private async deliver(
    recipientId: string,
    type: NotificationType,
    payload: object,
    email?: EmailContent,
  ): Promise<void> {
    const record = payload as Record<string, unknown>;
    try {
      await this.notificationsService.notifyInApp(recipientId, type, record);
      if (!email) return;
      const user = await this.usersService.getById(recipientId).catch(() => null);
      if (user?.email) {
        await this.notificationsService.notifyEmail(recipientId, user.email, type, record, email.subject, email.body);
      }
    } catch (err) {
      this.logger.error(`Failed to deliver ${type} notification to ${recipientId}: ${(err as Error).message}`);
    }
  }
}
