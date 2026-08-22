import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  MapPin,
  Tag,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  festivalSchedulesQuery,
  type FestivalScheduleItem,
} from "@/lib/festival";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function FestivalScheduleAdminTab() {
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading } = useQuery(festivalSchedulesQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FestivalScheduleItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleDate, setScheduleDate] = useState("2026-09-14");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [venue, setVenue] = useState("Main Sanctum");
  const [category, setCategory] = useState("pooja");
  const [isPublished, setIsPublished] = useState(true);

  // Available unique dates
  const availableDates = Array.from(
    new Set(schedules.map((s) => s.schedule_date)),
  ).sort();

  const handleOpenAddModal = (defaultDate = "2026-09-14") => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setScheduleDate(defaultDate);
    setStartTime("08:00");
    setEndTime("09:00");
    setVenue("Main Sanctum");
    setCategory("pooja");
    setIsPublished(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: FestivalScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setScheduleDate(item.schedule_date || "2026-09-14");
    setStartTime(item.start_time ? String(item.start_time).slice(0, 5) : "08:00");
    setEndTime(item.end_time ? String(item.end_time).slice(0, 5) : "");
    setVenue(item.venue || "Main Sanctum");
    setCategory(item.category || "pooja");
    setIsPublished(item.is_published !== false);
    setModalOpen(true);
  };

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!scheduleDate) throw new Error("Schedule date is required");
      if (!startTime) throw new Error("Start time is required");

      const payload = {
        title: title.trim(),
        description: description.trim(),
        schedule_date: scheduleDate,
        start_time: startTime,
        end_time: endTime ? endTime : null,
        venue: venue.trim(),
        category: category.toLowerCase(),
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      if (editingItem?.id) {
        const { error } = await (supabase.from as any)("festival_schedules")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await (supabase.from as any)("festival_schedules").insert([
          {
            ...payload,
            sort_order: schedules.length + 1,
          },
        ]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Schedule item updated!" : "New schedule item added!");
      queryClient.invalidateQueries({ queryKey: ["festival-schedules"] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save schedule");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("festival_schedules")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Schedule item deleted");
      queryClient.invalidateQueries({ queryKey: ["festival-schedules"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete schedule");
    },
  });

  // Toggle Publish Mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await (supabase.from as any)("festival_schedules")
        .update({ is_published: !is_published })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-schedules"] });
    },
  });

  // Filtered schedules
  const filteredSchedules = schedules.filter((item) => {
    const matchesDate =
      selectedDateFilter === "all" || item.schedule_date === selectedDateFilter;
    const matchesQuery =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.venue && item.venue.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDate && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-3xl border border-amber-500/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Daily Programme Manager
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" /> Festival Schedule Manager
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create, edit, and publish festival daily schedules for 14 Sep, 15 Sep, 16 Sep &amp; custom dates.
          </p>
        </div>

        <Button
          onClick={() => handleOpenAddModal(selectedDateFilter !== "all" ? selectedDateFilter : "2026-09-14")}
          className="gradient-saffron text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-full shadow-md shrink-0 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Schedule Item
        </Button>
      </div>

      {/* Date Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Date Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDateFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
              selectedDateFilter === "all"
                ? "bg-amber-500 text-stone-950 border-amber-500 shadow-sm"
                : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            All Dates ({schedules.length})
          </button>

          {["2026-09-14", "2026-09-15", "2026-09-16", ...availableDates.filter((d) => !["2026-09-14", "2026-09-15", "2026-09-16"].includes(d))].map((date) => {
            const count = schedules.filter((s) => s.schedule_date === date).length;
            const dateObj = new Date(date + "T00:00:00");
            const label = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
            
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDateFilter(date)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                  selectedDateFilter === date
                    ? "bg-amber-500 text-stone-950 border-amber-500 shadow-sm"
                    : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, venue..."
            className="pl-9 h-9 text-xs rounded-full bg-secondary/40 border-border/60"
          />
        </div>
      </div>

      {/* Schedule Items List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-3 text-xs font-medium">Loading schedule items...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-bold text-base text-foreground">No Schedule Items Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No items match your search query."
              : "No schedule items uploaded for this date yet. Click 'Add Schedule Item' to get started."}
          </p>
          <Button
            onClick={() => handleOpenAddModal(selectedDateFilter !== "all" ? selectedDateFilter : "2026-09-14")}
            variant="outline"
            className="mt-4 rounded-full text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Schedule Item
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredSchedules.map((item) => (
            <div
              key={item.id}
              className={`card-premium p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                !item.is_published ? "opacity-60 bg-secondary/20" : ""
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    {item.schedule_date}
                  </Badge>

                  <Badge className="rounded-full text-[10px] uppercase font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.start_time ? String(item.start_time).slice(0, 5) : ""}
                    {item.end_time ? ` – ${String(item.end_time).slice(0, 5)}` : ""}
                  </Badge>

                  <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                    <Tag className="h-3 w-3 mr-1" />
                    {item.category || "pooja"}
                  </Badge>

                  {!item.is_published && (
                    <Badge variant="destructive" className="rounded-full text-[10px]">
                      Draft / Hidden
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-base text-foreground break-words">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                {item.venue && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
                    <span>{item.venue}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    togglePublishMutation.mutate({
                      id: item.id,
                      is_published: item.is_published !== false,
                    })
                  }
                  className="rounded-full h-8 text-[11px] px-3"
                  title={item.is_published ? "Unpublish item" : "Publish item"}
                >
                  {item.is_published ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1" /> Published
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground mr-1" /> Draft
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditModal(item)}
                  className="rounded-full h-8 w-8 p-0"
                  title="Edit schedule item"
                >
                  <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Delete schedule "${item.title}"?`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="rounded-full h-8 w-8 p-0 border-red-500/30 hover:bg-red-500/10 text-red-500"
                  title="Delete schedule item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-amber-500/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              {editingItem ? "Edit Schedule Item" : "Add Festival Schedule Item"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure timing, date, location, and category for festival attendees.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 mt-3 text-left"
          >
            <div className="space-y-1.5">
              <Label htmlFor="sched-title" className="text-xs font-semibold">
                Event / Pooja Title *
              </Label>
              <Input
                id="sched-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prana Pratishtha & Maha Sankalpa"
                className="rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-date" className="text-xs font-semibold">
                  Date (YYYY-MM-DD) *
                </Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sched-cat" className="text-xs font-semibold">
                  Category
                </Label>
                <select
                  id="sched-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="pooja">Pooja / Homam</option>
                  <option value="aarti">Maha Aarti</option>
                  <option value="prasadam">Prasadam / Annadana</option>
                  <option value="cultural">Cultural / Music</option>
                  <option value="event">Competition / Event</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-start" className="text-xs font-semibold">
                  Start Time *
                </Label>
                <Input
                  id="sched-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sched-end" className="text-xs font-semibold">
                  End Time (Optional)
                </Label>
                <Input
                  id="sched-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-venue" className="text-xs font-semibold">
                Venue / Location
              </Label>
              <Input
                id="sched-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Main Sanctum / Annadana Hall"
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-desc" className="text-xs font-semibold">
                Description / Highlights
              </Label>
              <textarea
                id="sched-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of rituals, prasad, or performances..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sched-published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500"
              />
              <Label htmlFor="sched-published" className="text-xs font-medium cursor-pointer">
                Publish schedule item immediately
              </Label>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-full text-xs px-4"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="gradient-saffron text-primary-foreground font-bold text-xs px-5 rounded-full"
              >
                {saveMutation.isPending ? "Saving..." : editingItem ? "Update Schedule" : "Add Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
