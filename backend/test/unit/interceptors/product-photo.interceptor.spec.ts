import { ProductPhotosInterceptor } from 'src/modules/products/product-photo/interceptors/product-photo.interceptor';

describe('ProductPhotosInterceptor factory', () => {
  it('returns a dynamic interceptor class when called with default', () => {
    const InterceptorClass = ProductPhotosInterceptor();
    expect(typeof InterceptorClass).toBe('function');
  });

  it('returns different interceptor classes for different maxCount', () => {
    const InterceptorA = ProductPhotosInterceptor(2);
    const InterceptorB = ProductPhotosInterceptor(5);
    expect(InterceptorA).not.toBe(InterceptorB);
  });

  it('produced interceptor can be used as a constructor (class-like)', () => {
    const Dynamic = ProductPhotosInterceptor(1);
    // It is a class constructor / function. Instantiation by Nest normally injects dependencies.
    // We assert we can access its prototype (basic shape) without running Nest lifecycle.
    expect(Dynamic.prototype).toBeDefined();
    expect(typeof Dynamic.prototype.constructor).toBe('function');
  });
});
