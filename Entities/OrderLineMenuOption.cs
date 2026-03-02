namespace BlazorApp1.Entities
{
    public class OrderLineMenuOption
    {
        public Guid OrderLineId { get; set; }
        public OrderLine OrderLine { get; set; } = default!;

        public Guid MenuOptionId { get; set; }
        public MenuOption MenuOption { get; set; } = default!;

        public int Qty { get; set; } = 1;
        public decimal PriceDeltaSnapshot { get; set; }
    }



}
