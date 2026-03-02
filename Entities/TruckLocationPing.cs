namespace BlazorApp1.Entities
{
    public class TruckLocationPing : Entity
    {
        public Guid TruckPresenceId { get; set; }
        public TruckPresence TruckPresence { get; set; } = default!;

        public decimal Lat { get; set; }
        public decimal Lng { get; set; }
        public int? AccuracyMeters { get; set; }
        public DateTimeOffset CapturedAt { get; set; }
        public string? Source { get; set; } // mobile_app|admin
    }



}
