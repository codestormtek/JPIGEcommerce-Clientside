namespace BlazorApp1.Entities
{
    /* Map menu item => ecommerce SKU so it can be ordered through cart/checkout */
    public class MenuItemProductMap
    {
        public Guid MenuItemId { get; set; }
        public MenuItem MenuItem { get; set; } = default!;

        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;

        public Guid ProductItemId { get; set; }
        public ProductItem ProductItem { get; set; } = default!;

        public bool IsPrimary { get; set; } = true;
    }



}
