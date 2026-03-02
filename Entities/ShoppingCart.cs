namespace BlazorApp1.Entities
{
    public class ShoppingCart : AuditableEntity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public string Status { get; set; } = "active";
        public ICollection<ShoppingCartItem> Items { get; set; } = new List<ShoppingCartItem>();
    }



}
