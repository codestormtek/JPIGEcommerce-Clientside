namespace BlazorApp1.Entities
{
    public class Address : Entity
    {
        public string? UnitNumber { get; set; }
        public string? StreetNumber { get; set; }
        public string AddressLine1 { get; set; } = default!;
        public string? AddressLine2 { get; set; }
        public string City { get; set; } = default!;
        public string? Region { get; set; }
        public string PostalCode { get; set; } = default!;

        public Guid CountryId { get; set; }
        public Country Country { get; set; } = default!;
    }



}
