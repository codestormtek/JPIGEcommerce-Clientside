namespace BlazorApp1.Entities
{
    public class UserAddress : Entity
    {
        public Guid UserId { get; set; }
        public SiteUser User { get; set; } = default!;

        public Guid AddressId { get; set; }
        public Address Address { get; set; } = default!;

        public string? Label { get; set; }
        public bool IsDefault { get; set; }
    }



}
