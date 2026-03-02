namespace BlazorApp1.Entities
{
    public class CartItemOption
    {
        public Guid CartItemId { get; set; }
        public ShoppingCartItem CartItem { get; set; } = default!;

        public Guid VariationOptionId { get; set; }
        public VariationOption VariationOption { get; set; } = default!;
    }



}
