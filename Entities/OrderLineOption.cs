namespace BlazorApp1.Entities
{
    public class OrderLineOption
    {
        public Guid OrderLineId { get; set; }
        public OrderLine OrderLine { get; set; } = default!;

        public Guid VariationOptionId { get; set; }
        public VariationOption VariationOption { get; set; } = default!;
    }



}
