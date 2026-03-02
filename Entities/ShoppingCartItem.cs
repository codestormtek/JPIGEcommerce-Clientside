namespace BlazorApp1.Entities
{
    public class ShoppingCartItem : Entity
    {
        public Guid CartId { get; set; }
        public ShoppingCart Cart { get; set; } = default!;

        public Guid ProductItemId { get; set; }
        public ProductItem ProductItem { get; set; } = default!;

        public int Qty { get; set; }
        public decimal UnitPriceSnapshot { get; set; }

        public ICollection<CartItemOption> Options { get; set; } = new List<CartItemOption>();
    }



}
