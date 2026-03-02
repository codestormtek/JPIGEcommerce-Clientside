namespace BlazorApp1.Entities
{
    public class ScheduleEventMedia
    {
        public Guid EventId { get; set; }
        public ScheduleEvent Event { get; set; } = default!;

        public Guid MediaAssetId { get; set; }
        public MediaAsset MediaAsset { get; set; } = default!;

        public int SortOrder { get; set; }
    }



}
