namespace BlazorApp1.Entities
{
    public class OrderLine : Entity
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public Guid ProductItemId { get; set; }
        public ProductItem ProductItem { get; set; } = default!;

        public int Qty { get; set; }
        public decimal UnitPriceSnapshot { get; set; }
        public decimal LineTotal { get; set; }

        public string SkuSnapshot { get; set; } = default!;
        public string ProductNameSnapshot { get; set; } = default!;

        public ICollection<OrderLineOption> Options { get; set; } = new List<OrderLineOption>();

        // Catering-only add-ons
        public OrderLineCatering? Catering { get; set; }
        public ICollection<OrderLineMenuOption> MenuOptions { get; set; } = new List<OrderLineMenuOption>();
    }



}
