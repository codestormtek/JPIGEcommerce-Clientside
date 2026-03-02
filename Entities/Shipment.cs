namespace BlazorApp1.Entities
{
    public class Shipment : Entity
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public string? Carrier { get; set; }
        public string? TrackingNumber { get; set; }
        public string Status { get; set; } = "pending"; // pending|shipped|delivered|cancelled
        public DateTimeOffset? ShippedAt { get; set; }
        public DateTimeOffset? DeliveredAt { get; set; }

        public ICollection<ShipmentItem> Items { get; set; } = new List<ShipmentItem>();
    }



}
