namespace BlazorApp1.Entities
{
    public class OrderLineCatering
    {
        public Guid OrderLineId { get; set; }
        public OrderLine OrderLine { get; set; } = default!;

        public string PricingModel { get; set; } = default!;
        public int? ServingsQty { get; set; }
        public string? Notes { get; set; }
    }



}
