namespace BlazorApp1.Entities
{
    public class SiteUser : AuditableEntity
    {
        public string EmailAddress { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public string PasswordHash { get; set; } = default!;
        public bool IsActive { get; set; } = true;

        public UserContactPreference? ContactPreference { get; set; }

        public ICollection<UserAddress> UserAddresses { get; set; } = new List<UserAddress>();
        public ICollection<ShoppingCart> ShoppingCarts { get; set; } = new List<ShoppingCart>();
        public ICollection<ShopOrder> Orders { get; set; } = new List<ShopOrder>();
    }



}
