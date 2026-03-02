namespace BlazorApp1.Entities
{
    public class ShippingMethod : Entity
    {
        public string Name { get; set; } = default!;
        public decimal Price { get; set; }
    }



}
