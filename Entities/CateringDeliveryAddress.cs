namespace BlazorApp1.Entities
{
    public class CateringDeliveryAddress
    {
        public Guid OrderId { get; set; }
        public ShopOrder Order { get; set; } = default!;

        public string AddressLine1 { get; set; } = default!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = default!;
        public string? Region { get; set; }
        public string PostalCode { get; set; } = default!;
        public string CountryName { get; set; } = default!;
        public string? Instructions { get; set; }
    }



}
