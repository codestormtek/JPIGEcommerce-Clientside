namespace BlazorApp1.Entities
{
    public class OrderAddress : Entity
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public string AddressType { get; set; } = default!; // shipping|billing

        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }

        public string? UnitNumber { get; set; }
        public string? StreetNumber { get; set; }
        public string AddressLine1 { get; set; } = default!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = default!;
        public string? Region { get; set; }
        public string PostalCode { get; set; } = default!;
        public string CountryName { get; set; } = default!;
        public string? CountryIso2 { get; set; }
    }



}
