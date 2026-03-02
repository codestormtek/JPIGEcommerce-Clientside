namespace BlazorApp1.Entities
{
    public class Country : Entity
    {
        public string CountryName { get; set; } = default!;
        public string? Iso2 { get; set; }

        public ICollection<Address> Addresses { get; set; } = new List<Address>();
    }



}
