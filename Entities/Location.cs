namespace BlazorApp1.Entities
{
    /* Mobile schedule */
    public class Location : Entity
    {
        public string Name { get; set; } = default!;
        public Guid? AddressId { get; set; }
        public Address? Address { get; set; }

        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<ScheduleEvent> Events { get; set; } = new List<ScheduleEvent>();
    }



}
