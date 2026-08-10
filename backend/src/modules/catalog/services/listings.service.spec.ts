import { ListingsService } from './listings.service';
import { ListingRepository } from '../repositories/listing.repository';
import { ListingPhotoRepository } from '../repositories/listing-photo.repository';
import { CategoriesService } from './categories.service';
import { ListingAttributeValidatorService } from './listing-attribute-validator.service';
import { ListingCondition, ListingStatus, PriceUnit } from '../enums/listing.enums';

describe('ListingsService', () => {
  let service: ListingsService;
  let listingRepository: Record<'create' | 'save' | 'findByIdOrFail', jest.Mock>;
  let photoRepository: Record<'countByListing' | 'create' | 'save', jest.Mock>;
  let categoriesService: Record<'getByIdOrFail' | 'assertActive', jest.Mock>;
  let attributeValidator: Record<'validate', jest.Mock>;

  const activeCategory = {
    id: 'cat-1',
    slug: 'tools',
    isActive: true,
    commissionRateBps: 500,
    attributeSchema: {},
  };

  beforeEach(() => {
    listingRepository = {
      create: jest.fn((partial) => partial),
      save: jest.fn(async (entity) => ({ ...entity, id: 'listing-1' })),
      findByIdOrFail: jest.fn(),
    };
    photoRepository = {
      countByListing: jest.fn(async () => 0),
      create: jest.fn((p) => p),
      save: jest.fn(async (p) => p),
    };
    categoriesService = {
      getByIdOrFail: jest.fn(async () => activeCategory),
      assertActive: jest.fn(),
    };
    attributeValidator = { validate: jest.fn() };

    service = new ListingsService(
      listingRepository as unknown as ListingRepository,
      photoRepository as unknown as ListingPhotoRepository,
      categoriesService as unknown as CategoriesService,
      attributeValidator as unknown as ListingAttributeValidatorService,
    );
  });

  describe('create', () => {
    const dto = {
      categoryId: 'cat-1',
      title: '20KVA Generator',
      description: 'Heavy duty',
      priceMinor: 4500000,
      priceUnit: PriceUnit.DAY,
      locationText: 'Sabon Gari, Kano',
      condition: ListingCondition.GOOD,
      cancellationPolicy: undefined,
      bookingMode: undefined,
    } as any;

    it('validates listing attributes against the category schema before creating', async () => {
      await service.create('provider-1', { ...dto, attributes: { power: 20 } });

      expect(categoriesService.assertActive).toHaveBeenCalledWith(activeCategory);
      expect(attributeValidator.validate).toHaveBeenCalledWith(activeCategory, { power: 20 });
      expect(listingRepository.save).toHaveBeenCalled();
    });

    it('creates every new listing as DRAFT regardless of input', async () => {
      await service.create('provider-1', dto);

      expect(listingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ListingStatus.DRAFT, providerId: 'provider-1' }),
      );
    });

    it('propagates a rejection when the category is inactive', async () => {
      categoriesService.assertActive.mockImplementation(() => {
        throw new Error('CATEGORY_INACTIVE');
      });

      await expect(service.create('provider-1', dto)).rejects.toThrow('CATEGORY_INACTIVE');
      expect(listingRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getDetail', () => {
    it('hides a non-live listing behind LISTING_NOT_LIVE', async () => {
      listingRepository.findByIdOrFail.mockResolvedValue({ id: 'l1', status: ListingStatus.DRAFT });

      await expect(service.getDetail('l1')).rejects.toMatchObject({ code: 'LISTING_NOT_LIVE' });
    });

    it('returns a live listing', async () => {
      const live = { id: 'l1', status: ListingStatus.LIVE };
      listingRepository.findByIdOrFail.mockResolvedValue(live);

      await expect(service.getDetail('l1')).resolves.toBe(live);
    });
  });

  describe('computeQuote', () => {
    const listing = { priceMinor: 20000, depositMinor: 15000 } as any;

    it('charges a minimum of 1 night even for a same-day range', () => {
      const from = new Date('2026-08-10T10:00:00Z');
      const to = new Date('2026-08-10T14:00:00Z');

      const quote = service.computeQuote(listing, from, to, 500);

      expect(quote.nights).toBe(1);
      expect(quote.rentalFeeMinor).toBe(20000);
    });

    it('rounds nights up for a partial extra day (checkout convention: ceil, not floor)', () => {
      const from = new Date('2026-08-10T10:00:00Z');
      const to = new Date('2026-08-12T08:00:00Z'); // ~1.9 days

      const quote = service.computeQuote(listing, from, to, 500);

      expect(quote.nights).toBe(2);
      expect(quote.rentalFeeMinor).toBe(40000);
    });

    it('computes the service fee from the category commission rate in basis points', () => {
      const from = new Date('2026-08-10T10:00:00Z');
      const to = new Date('2026-08-13T10:00:00Z'); // exactly 3 nights

      const quote = service.computeQuote(listing, from, to, 500); // 5%

      expect(quote.rentalFeeMinor).toBe(60000);
      expect(quote.serviceFeeMinor).toBe(3000);
      expect(quote.depositMinor).toBe(15000);
      expect(quote.totalMinor).toBe(78000);
    });

    it('rejects a return date that is not after the pickup date', () => {
      const from = new Date('2026-08-10T10:00:00Z');
      const to = new Date('2026-08-09T10:00:00Z');

      expect(() => service.computeQuote(listing, from, to, 500)).toThrow(
        expect.objectContaining({ code: 'BOOKING_DATE_RANGE_INVALID' }),
      );
    });

    it('treats a missing deposit as zero', () => {
      const noDeposit = { priceMinor: 10000, depositMinor: null } as any;
      const from = new Date('2026-08-10T10:00:00Z');
      const to = new Date('2026-08-11T10:00:00Z');

      const quote = service.computeQuote(noDeposit, from, to, 0);

      expect(quote.depositMinor).toBe(0);
      expect(quote.totalMinor).toBe(10000);
    });
  });
});
