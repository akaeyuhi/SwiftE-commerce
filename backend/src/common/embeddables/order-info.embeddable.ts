import { Column } from 'typeorm';

/**
 * OrderInfo (embeddable)
 *
 * Embedded container for shipping / billing information stored on the Order row.
 * Using an embeddable keeps address fields physically on the `orders` table
 * (no separate Address table required).
 *
 * NOTE: TypeORM will prefix column names with the property name by default, e.g.
 * `shipping_firstName`, `shipping_addressLine1` when used as `@Column(() => OrderInfo)` on
 * a property named `shipping`.
 */
export class OrderInfo {
  /** Recipient first name */
  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  /** Recipient last name (optional) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  /** Company name (optional) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  company?: string;

  /** Primary address line (street, house number) */
  @Column({ type: 'varchar', length: 255 })
  addressLine1: string;

  /** Secondary address line (apt, suite) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2?: string;

  /** City / locality */
  @Column({ type: 'varchar', length: 100 })
  city: string;

  /** State / region / province (optional) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  /** Postal / ZIP code */
  @Column({ type: 'varchar', length: 30 })
  postalCode: string;

  /** ISO country code or full country string */
  @Column({ type: 'varchar', length: 100 })
  country: string;

  /** Contact phone number for shipping carrier */
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  /** Contact email */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /** Free-form instructions for delivery (leave at door, call on arrival, etc.) */
  @Column({ type: 'text', nullable: true })
  deliveryInstructions?: string;

  /** Shipping method chosen (e.g., 'standard', 'express') */
  @Column({ type: 'varchar', length: 100, nullable: true })
  shippingMethod?: string;
}
