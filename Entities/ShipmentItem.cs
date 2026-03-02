namespace BlazorApp1.Entities
{
    public class ShipmentItem
    {
        public Guid ShipmentId { get; set; }
        public Shipment Shipment { get; set; } = default!;

        public Guid OrderLineId { get; set; }
        public OrderLine OrderLine { get; set; } = default!;

        public int Qty { get; set; }
    }



}
