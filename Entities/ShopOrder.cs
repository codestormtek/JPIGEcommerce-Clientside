namespace BlazorApp1.Entities
{
    public class ShopOrder : Entity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public DateTimeOffset OrderDate { get; set; }

        public Guid OrderStatusId { get; set; }
        public OrderStatus OrderStatus { get; set; } = default!;

        public Guid? ShippingMethodId { get; set; }
        public ShippingMethod? ShippingMethod { get; set; }

        public string Currency { get; set; } = "USD";
        public decimal Subtotal { get; set; }
        public decimal DiscountTotal { get; set; }
        public decimal TaxTotal { get; set; }
        public decimal ShippingTotal { get; set; }
        public decimal GrandTotal { get; set; }

        // Catering
        public string OrderType { get; set; } = "retail"; // retail|catering
        public string? FulfillmentType { get; set; }     // pickup|delivery|onsite
        public DateTimeOffset? RequestedFulfillmentAt { get; set; }
        public string? EventName { get; set; }
        public int? Headcount { get; set; }
        public string? SpecialInstructions { get; set; }

        public ICollection<OrderLine> Lines { get; set; } = new List<OrderLine>();
        public ICollection<OrderAddress> Addresses { get; set; } = new List<OrderAddress>();
        public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();

        public Shipment? Shipment { get; set; }
        public CateringDeliveryAddress? CateringDeliveryAddress { get; set; }
    }



}
