"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ButtonLoader } from "@/components/ui/button-loader";

import { getCachedData, setCachedData } from "@/lib/cache";
import {
  StateItem,
  CityItem,
  AreaItem,
} from "@/types/location";
import {
  getStates,
  createState,
  updateState,
  deleteState,
  getCitiesByState,
  createCity,
  updateCity,
  deleteCity,
  getAreasByCity,
  createArea,
  updateArea,
  deleteArea,
} from "@/services/location-service";

interface ConflictInfo {
  type: "state" | "city" | "area";
  id: string;
  name: string;
  message: string;
}

interface DeleteTarget {
  type: "state" | "city" | "area";
  id: string;
  name: string;
}

export default function ServiceabilityPage() {
  // Master Hierarchy Data
  const [states, setStates] = useState<StateItem[]>([]);
  const [citiesMap, setCitiesMap] = useState<Record<string, CityItem[]>>({});
  const [areasMap, setAreasMap] = useState<Record<string, AreaItem[]>>({});

  // Loading States
  const [isLoadingStates, setIsLoadingStates] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Modal States
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<StateItem | null>(null);
  const [stateFormName, setStateFormName] = useState("");
  const [stateFormActive, setStateFormActive] = useState(true);

  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [targetStateIdForCity, setTargetStateIdForCity] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);
  const [cityFormName, setCityFormName] = useState("");
  const [cityFormActive, setCityFormActive] = useState(true);

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [targetCityIdForArea, setTargetCityIdForArea] = useState<string | null>(null);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);
  const [areaFormName, setAreaFormName] = useState("");
  const [areaFormPincode, setAreaFormPincode] = useState("");
  const [areaFormActive, setAreaFormActive] = useState(true);

  // Delete & Conflict Modals
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Helper to show toasts
  const notify = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // -------------------------------------------------------------
  // Load Hierarchy Data (States -> Cities -> Areas with SWR)
  // -------------------------------------------------------------
  const loadAreasForCity = useCallback(async (cityId: string, force = false) => {
    try {
      const areas = await getAreasByCity(cityId, {
        forceRefresh: force,
        onFreshData: (fresh) => {
          setAreasMap((prev) => ({ ...prev, [cityId]: fresh }));
        },
      });
      setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
    } catch {
      // Fallback already handled inside getAreasByCity
    }
  }, []);

  const loadCitiesForState = useCallback(async (stateId: string, force = false) => {
    try {
      const cities = await getCitiesByState(stateId, {
        forceRefresh: force,
        onFreshData: (fresh) => {
          setCitiesMap((prev) => ({ ...prev, [stateId]: fresh }));
          fresh.forEach((city) => {
            loadAreasForCity(city.id, force);
          });
        },
      });
      setCitiesMap((prev) => ({ ...prev, [stateId]: cities }));
      cities.forEach((city) => {
        loadAreasForCity(city.id, force);
      });
    } catch {
      // Fallback already handled inside getCitiesByState
    }
  }, [loadAreasForCity]);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    setIsLoadingStates(true);
    setLoadError(null);
    try {
      const stateList = await getStates({
        forceRefresh,
        onFreshData: (fresh) => {
          setStates(fresh);
          fresh.forEach((state) => {
            loadCitiesForState(state.id, forceRefresh);
          });
          setIsLoadingStates(false);
        },
      });

      if (stateList && stateList.length > 0) {
        setStates(stateList);
        stateList.forEach((state) => {
          loadCitiesForState(state.id, forceRefresh);
        });
      } else {
        const cached = getCachedData<StateItem[]>("locations:states");
        if (cached && cached.length > 0) {
          setStates(cached);
          cached.forEach((state) => {
            loadCitiesForState(state.id, forceRefresh);
          });
        }
      }
    } catch (err) {
      const cached = getCachedData<StateItem[]>("locations:states");
      if (cached && cached.length > 0) {
        setStates(cached);
      } else {
        setLoadError(err instanceof Error ? err.message : "Failed to load serviceable locations.");
      }
    } finally {
      setIsLoadingStates(false);
    }
  }, [loadCitiesForState]);

  // Initial instant hydration from local cache (0ms)
  useEffect(() => {
    const cachedStates = getCachedData<StateItem[]>("locations:states");
    if (cachedStates && cachedStates.length > 0) {
      setStates(cachedStates);
      setIsLoadingStates(false);
      cachedStates.forEach((state) => {
        const cachedCities = getCachedData<CityItem[]>(`locations:cities:${state.id}`);
        if (cachedCities && cachedCities.length > 0) {
          setCitiesMap((prev) => ({ ...prev, [state.id]: cachedCities }));
          cachedCities.forEach((city) => {
            const cachedAreas = getCachedData<AreaItem[]>(`locations:areas:${city.id}`);
            if (cachedAreas) {
              setAreasMap((prev) => ({ ...prev, [city.id]: cachedAreas }));
            }
          });
        }
      });
    }
    fetchAllData();
  }, [fetchAllData]);

  // -------------------------------------------------------------
  // Toggle Switch Direct Actions
  // -------------------------------------------------------------
  const handleToggleStateActive = async (state: StateItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !state.isActive;
    const updatedStates = states.map((s) => (s.id === state.id ? { ...s, isActive: nextState } : s));
    setStates(updatedStates);
    setCachedData("locations:states", updatedStates);

    try {
      await updateState(state.id, { isActive: nextState });
      notify(`${state.name} is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = states.map((s) => (s.id === state.id ? { ...s, isActive: !nextState } : s));
      setStates(reverted);
      setCachedData("locations:states", reverted);
      const msg = err instanceof Error ? err.message : "Failed to update state status";
      notify(msg, "error");
    }
  };

  const handleToggleCityActive = async (city: CityItem, stateId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !city.isActive;
    const currentCities = citiesMap[stateId] || [];
    const updatedCities = currentCities.map((c) => (c.id === city.id ? { ...c, isActive: nextState } : c));
    setCitiesMap((prev) => ({ ...prev, [stateId]: updatedCities }));
    setCachedData(`locations:cities:${stateId}`, updatedCities);

    try {
      await updateCity(city.id, { isActive: nextState }, stateId);
      notify(`${city.name} is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = currentCities.map((c) => (c.id === city.id ? { ...c, isActive: !nextState } : c));
      setCitiesMap((prev) => ({ ...prev, [stateId]: reverted }));
      setCachedData(`locations:cities:${stateId}`, reverted);
      const msg = err instanceof Error ? err.message : "Failed to update city status";
      notify(msg, "error");
    }
  };

  const handleToggleAreaActive = async (area: AreaItem, cityId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !area.isActive;
    const currentAreas = areasMap[cityId] || [];
    const updatedAreas = currentAreas.map((a) => (a.id === area.id ? { ...a, isActive: nextState } : a));
    setAreasMap((prev) => ({ ...prev, [cityId]: updatedAreas }));
    setCachedData(`locations:areas:${cityId}`, updatedAreas);

    try {
      await updateArea(area.id, { isActive: nextState }, cityId);
      notify(`${area.name} (${area.pincode}) is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = currentAreas.map((a) => (a.id === area.id ? { ...a, isActive: !nextState } : a));
      setAreasMap((prev) => ({ ...prev, [cityId]: reverted }));
      setCachedData(`locations:areas:${cityId}`, reverted);
      const msg = err instanceof Error ? err.message : "Failed to update area status";
      notify(msg, "error");
    }
  };

  // -------------------------------------------------------------
  // State CRUD
  // -------------------------------------------------------------
  const handleOpenAddState = () => {
    setEditingState(null);
    setStateFormName("");
    setStateFormActive(true);
    setStateModalOpen(true);
  };

  const handleOpenEditState = (state: StateItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingState(state);
    setStateFormName(state.name);
    setStateFormActive(state.isActive);
    setStateModalOpen(true);
  };

  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateFormName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingState) {
        const updated = await updateState(editingState.id, {
          name: stateFormName.trim(),
          isActive: stateFormActive,
        });
        const updatedStates = states.map((s) => (s.id === editingState.id ? updated : s));
        setStates(updatedStates);
        setCachedData("locations:states", updatedStates);
        notify(`State "${updated.name}" updated successfully.`);
      } else {
        const created = await createState(stateFormName.trim());
        const updatedStates = [...states, created];
        setStates(updatedStates);
        setCachedData("locations:states", updatedStates);
        notify(`State "${created.name}" created successfully.`);
      }
      setStateModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save state";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // City CRUD
  // -------------------------------------------------------------
  const handleOpenAddCity = (stateId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetStateIdForCity(stateId);
    setEditingCity(null);
    setCityFormName("");
    setCityFormActive(true);
    setCityModalOpen(true);
  };

  const handleOpenEditCity = (city: CityItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetStateIdForCity(city.stateId);
    setEditingCity(city);
    setCityFormName(city.name);
    setCityFormActive(city.isActive);
    setCityModalOpen(true);
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityFormName.trim() || !targetStateIdForCity) return;
    setIsSubmitting(true);
    try {
      if (editingCity) {
        const updated = await updateCity(
          editingCity.id,
          {
            name: cityFormName.trim(),
            isActive: cityFormActive,
          },
          targetStateIdForCity
        );
        const currentCities = citiesMap[targetStateIdForCity] || [];
        const updatedCities = currentCities.map((c) => (c.id === editingCity.id ? updated : c));
        setCitiesMap((prev) => ({ ...prev, [targetStateIdForCity]: updatedCities }));
        setCachedData(`locations:cities:${targetStateIdForCity}`, updatedCities);
        notify(`City "${updated.name}" updated successfully.`);
      } else {
        const created = await createCity(targetStateIdForCity, cityFormName.trim());
        const currentCities = citiesMap[targetStateIdForCity] || [];
        const updatedCities = [...currentCities, created];
        setCitiesMap((prev) => ({ ...prev, [targetStateIdForCity]: updatedCities }));
        setCachedData(`locations:cities:${targetStateIdForCity}`, updatedCities);
        notify(`City "${created.name}" created successfully.`);
      }
      setCityModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save city";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Area CRUD
  // -------------------------------------------------------------
  const handleOpenAddArea = (cityId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetCityIdForArea(cityId);
    setEditingArea(null);
    setAreaFormName("");
    setAreaFormPincode("");
    setAreaFormActive(true);
    setAreaModalOpen(true);
  };

  const handleOpenEditArea = (area: AreaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetCityIdForArea(area.cityId);
    setEditingArea(area);
    setAreaFormName(area.name);
    setAreaFormPincode(area.pincode);
    setAreaFormActive(area.isActive);
    setAreaModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormName.trim() || !areaFormPincode.trim() || !targetCityIdForArea) return;
    setIsSubmitting(true);
    try {
      if (editingArea) {
        const updated = await updateArea(
          editingArea.id,
          {
            name: areaFormName.trim(),
            pincode: areaFormPincode.trim(),
            isActive: areaFormActive,
          },
          targetCityIdForArea
        );
        const currentAreas = areasMap[targetCityIdForArea] || [];
        const updatedAreas = currentAreas.map((a) => (a.id === editingArea.id ? updated : a));
        setAreasMap((prev) => ({ ...prev, [targetCityIdForArea]: updatedAreas }));
        setCachedData(`locations:areas:${targetCityIdForArea}`, updatedAreas);
        notify(`Area "${updated.name}" updated successfully.`);
      } else {
        const created = await createArea(
          targetCityIdForArea,
          areaFormName.trim(),
          areaFormPincode.trim()
        );
        const currentAreas = areasMap[targetCityIdForArea] || [];
        const updatedAreas = [...currentAreas, created];
        setAreasMap((prev) => ({ ...prev, [targetCityIdForArea]: updatedAreas }));
        setCachedData(`locations:areas:${targetCityIdForArea}`, updatedAreas);
        notify(`Area "${created.name}" created successfully.`);
      }
      setAreaModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save area";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete & 409 Conflict Safety Handling
  // -------------------------------------------------------------
  const handlePromptDelete = (
    type: "state" | "city" | "area",
    id: string,
    name: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    setDeleteTarget({ type, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    const { type, id, name } = deleteTarget;

    try {
      if (type === "state") {
        await deleteState(id);
        const updatedStates = states.filter((s) => s.id !== id);
        setStates(updatedStates);
        setCachedData("locations:states", updatedStates);
        notify(`State "${name}" deleted.`);
      } else if (type === "city") {
        // Find stateId
        let parentStateId = "";
        for (const [stId, cityList] of Object.entries(citiesMap)) {
          if (cityList.some((c) => c.id === id)) {
            parentStateId = stId;
            break;
          }
        }
        await deleteCity(id, parentStateId || undefined);
        if (parentStateId) {
          const updatedCities = (citiesMap[parentStateId] || []).filter((c) => c.id !== id);
          setCitiesMap((prev) => ({ ...prev, [parentStateId]: updatedCities }));
          setCachedData(`locations:cities:${parentStateId}`, updatedCities);
        }
        notify(`City "${name}" deleted.`);
      } else if (type === "area") {
        let parentCityId = "";
        for (const [cId, areaList] of Object.entries(areasMap)) {
          if (areaList.some((a) => a.id === id)) {
            parentCityId = cId;
            break;
          }
        }
        await deleteArea(id, parentCityId || undefined);
        if (parentCityId) {
          const updatedAreas = (areasMap[parentCityId] || []).filter((a) => a.id !== id);
          setAreasMap((prev) => ({ ...prev, [parentCityId]: updatedAreas }));
          setCachedData(`locations:areas:${parentCityId}`, updatedAreas);
        }
        notify(`Area "${name}" deleted.`);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      const isConflict =
        (typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: number }).statusCode === 409) ||
        (err instanceof Error && (err.message.includes("409") || err.message.toLowerCase().includes("conflict") || err.message.toLowerCase().includes("cannot delete")));

      if (isConflict) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : `Cannot delete ${type} "${name}" because active child records or customer delivery addresses depend on it.`;
        setConflictInfo({ type, id, name, message: errorMsg });
      } else {
        const msg = err instanceof Error ? err.message : "Failed to delete location";
        notify(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableInstead = async () => {
    if (!conflictInfo) return;
    setIsSubmitting(true);
    const { type, id, name } = conflictInfo;
    try {
      if (type === "state") {
        await updateState(id, { isActive: false });
        const updated = states.map((s) => (s.id === id ? { ...s, isActive: false } : s));
        setStates(updated);
        setCachedData("locations:states", updated);
        notify(`State "${name}" is now disabled.`);
      } else if (type === "city") {
        await updateCity(id, { isActive: false });
        setCitiesMap((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((c) => (c.id === id ? { ...c, isActive: false } : c));
          }
          return next;
        });
        notify(`City "${name}" is now disabled.`);
      } else if (type === "area") {
        await updateArea(id, { isActive: false });
        setAreasMap((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((a) => (a.id === id ? { ...a, isActive: false } : a));
          }
          return next;
        });
        notify(`Area "${name}" is now disabled.`);
      }
      setConflictInfo(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to disable location";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Metrics Calculation (for Top Maroon Banner)
  // -------------------------------------------------------------
  const allCities = useMemo(() => Object.values(citiesMap).flat(), [citiesMap]);
  const allAreas = useMemo(() => Object.values(areasMap).flat(), [areasMap]);

  const livePincodesCount = useMemo(() => {
    let count = 0;
    states.forEach((state) => {
      if (!state.isActive) return;
      const cList = citiesMap[state.id] || [];
      cList.forEach((city) => {
        if (!city.isActive) return;
        const aList = areasMap[city.id] || [];
        aList.forEach((area) => {
          if (area.isActive) count++;
        });
      });
    });
    return count;
  }, [states, citiesMap, areasMap]);

  // -------------------------------------------------------------
  // Filtered States according to Search & Status
  // -------------------------------------------------------------
  const filteredStates = useMemo(() => {
    return states.filter((state) => {
      // 1. Status Filter
      if (filterStatus === "ACTIVE" && !state.isActive) return false;
      if (filterStatus === "INACTIVE" && state.isActive) return false;

      // 2. Search Query (matches state, any city in state, or any area/pincode in state)
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      if (state.name.toLowerCase().includes(q)) return true;

      const cList = citiesMap[state.id] || [];
      const hasMatchingCity = cList.some((c) => c.name.toLowerCase().includes(q));
      if (hasMatchingCity) return true;

      const hasMatchingArea = cList.some((c) => {
        const aList = areasMap[c.id] || [];
        return aList.some(
          (a) => a.name.toLowerCase().includes(q) || a.pincode.toLowerCase().includes(q)
        );
      });
      return hasMatchingArea;
    });
  }, [states, filterStatus, searchQuery, citiesMap, areasMap]);

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-[#FFD84D] selection:text-[#1A1A1A]">
      {/* ============================================================= */}
      {/* 1. TOP MAROON OPERATIONAL BANNER (Reference Matched)          */}
      {/* ============================================================= */}
      <div className="bg-[#4A1515] text-white rounded-[14px] border-2 border-[#1A1A1A] shadow-[5px_5px_0px_0px_#1A1A1A] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Metrics */}
        <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#FFD84D] leading-none">
              {states.length}
            </div>
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E4DFD0] mt-1">
              States
            </div>
          </div>

          <div className="h-8 w-[2px] bg-white/20 hidden sm:block" />

          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#FFD84D] leading-none">
              {allCities.length}
            </div>
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E4DFD0] mt-1">
              Cities
            </div>
          </div>

          <div className="h-8 w-[2px] bg-white/20 hidden sm:block" />

          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#FFD84D] leading-none">
              {allAreas.length}
            </div>
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E4DFD0] mt-1">
              Areas
            </div>
          </div>

          <div className="h-8 w-[2px] bg-white/20 hidden sm:block" />

          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#FFD84D] leading-none">
              {livePincodesCount}
            </div>
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#E4DFD0] mt-1">
              Live Pincodes
            </div>
          </div>
        </div>

        {/* Right Operational Rule Formula */}
        <div className="text-right flex items-center lg:justify-end">
          <span className="font-mono text-xs sm:text-xs font-bold text-[#E4DFD0] tracking-wide leading-relaxed">
            RULE: STATE <span className="text-[#FFD84D]">[ON]</span> + CITY{" "}
            <span className="text-[#FFD84D]">[ON]</span> + AREA{" "}
            <span className="text-[#FFD84D]">[ON]</span> ={" "}
            <span className="text-[#8FD694] font-black">ACTIVE DOORSTEP DELIVERY</span>
          </span>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. SEARCH & FILTER TOOLBAR                                    */}
      {/* ============================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search state, city, area or 6-digit pincode"
            className="w-full h-11 pl-10 pr-4 bg-white border-2 border-[#1A1A1A] rounded-[10px] text-xs font-semibold placeholder:text-[#5C5647]/70 shadow-[2px_2px_0px_0px_#1A1A1A] focus-visible:ring-2 focus-visible:ring-[#FFD84D]"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A1A1A]/70 stroke-[2.5]" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#5C5647] hover:text-[#1A1A1A]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs & Add State Button */}
        <div className="grid w-full grid-cols-3 items-center gap-2 sm:w-auto sm:flex sm:shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`h-11 w-full px-2 text-[10px] font-black uppercase tracking-tight border-2 border-[#1A1A1A] rounded-[10px] transition-all cursor-pointer sm:w-auto sm:px-4 sm:text-xs sm:tracking-wider ${
              filterStatus === "ALL"
                ? "bg-[#FFD84D] shadow-[3px_3px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#1A1A1A]"
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("ACTIVE")}
            className={`h-11 w-full px-2 text-[10px] font-black uppercase tracking-tight border-2 border-[#1A1A1A] rounded-[10px] transition-all cursor-pointer sm:w-auto sm:px-4 sm:text-xs sm:tracking-wider ${
              filterStatus === "ACTIVE"
                ? "bg-[#FFD84D] shadow-[3px_3px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#1A1A1A]"
            }`}
          >
            ACTIVE
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("INACTIVE")}
            className={`h-11 w-full px-2 text-[10px] font-black uppercase tracking-tight border-2 border-[#1A1A1A] rounded-[10px] transition-all cursor-pointer sm:w-auto sm:px-4 sm:text-xs sm:tracking-wider ${
              filterStatus === "INACTIVE"
                ? "bg-[#FFD84D] shadow-[3px_3px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#1A1A1A]"
            }`}
          >
            INACTIVE
          </button>

          <Button
            type="button"
            onClick={handleOpenAddState}
            className="col-span-3 h-11 w-full justify-center px-4 bg-[#FFD84D] hover:bg-[#E6C23D] border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 sm:col-span-1 sm:w-auto"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add State</span>
          </Button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 p-3.5 border-2 border-[#1A1A1A] rounded-[10px] font-mono text-xs font-black shadow-[4px_4px_0px_0px_#1A1A1A] animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success" ? "bg-[#B9E8B4] text-[#1A1A1A]" : "bg-[#FFD9D0] text-[#1A1A1A]"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          ) : (
            <AlertTriangle className="h-4 w-4 stroke-[3]" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. GRID OF STATE CARDS (Reference Matched)                     */}
      {/* ============================================================= */}
      {isLoadingStates && states.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-4 space-y-4 animate-pulse"
            >
              <div className="h-10 bg-[#FFD84D]/40 rounded-[10px]" />
              <div className="h-32 bg-[#FAF7EC] rounded-[12px]" />
              <div className="h-32 bg-[#FAF7EC] rounded-[12px]" />
            </div>
          ))}
        </div>
      ) : filteredStates.length === 0 ? (
        <div className="border-2 border-dashed border-[#1A1A1A] rounded-[14px] p-10 text-center bg-white shadow-[4px_4px_0px_0px_#1A1A1A] space-y-3">
          <p className="text-sm font-black uppercase text-[#1A1A1A]">
            No matching locations found
          </p>
          <p className="text-xs font-semibold text-[#5C5647]">
            {searchQuery
              ? `No states, cities, or areas match "${searchQuery}".`
              : "No states configured for the selected filter."}
          </p>
          <Button
            type="button"
            onClick={handleOpenAddState}
            className="bg-[#FFD84D] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] font-black text-xs uppercase px-4 py-2 mt-2"
          >
            + Add New State
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredStates.map((state) => {
            const stateCities = citiesMap[state.id] || [];
            const stateAreas = stateCities.flatMap((c) => areasMap[c.id] || []);
            const livePincodesInState = stateAreas.filter(
              (a) =>
                a.isActive &&
                state.isActive &&
                Boolean(stateCities.find((c) => c.id === a.cityId)?.isActive)
            ).length;

            return (
              <div
                key={state.id}
                className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] overflow-hidden flex flex-col transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A]"
              >
                {/* State Card Header */}
                <div
                  className={`p-3.5 border-b-2 border-[#1A1A1A] transition-colors ${
                    state.isActive ? "bg-[#FFD84D]" : "bg-[#E4DFD0]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A] truncate pr-2">
                      {state.name}
                    </h2>

                    {/* State Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={state.isActive}
                      onClick={(e) => handleToggleStateActive(state, e)}
                      title={state.isActive ? "Disable State" : "Enable State"}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-[#1A1A1A] transition-colors duration-200 ease-in-out ${
                        state.isActive ? "bg-[#8FD694]" : "bg-[#D9D2BD]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full border-2 border-[#1A1A1A] bg-white shadow-xs transition duration-200 ease-in-out ${
                          state.isActive ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Status Badge & Summary Row */}
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span
                      className={`inline-flex items-center border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#1A1A1A] ${
                        state.isActive ? "bg-[#B9E8B4] text-[#1A1A1A]" : "bg-white text-[#1A1A1A]"
                      }`}
                    >
                      {state.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>

                    <span className="text-[11px] font-mono font-bold text-[#5C5647]">
                      {stateCities.length} {stateCities.length === 1 ? "city" : "cities"} •{" "}
                      {livePincodesInState} live pincodes
                    </span>
                  </div>
                </div>

                {/* Cities Container */}
                <div className="p-3 space-y-3 flex-1 min-h-[140px] max-h-[580px] overflow-y-auto bg-[#FAF7EC]/30">
                  {stateCities.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-[#1A1A1A] rounded-[12px] text-center bg-white my-2">
                      <p className="text-xs font-bold text-[#5C5647]">
                        No cities added to {state.name}.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleOpenAddCity(state.id, e)}
                        className="mt-2 text-xs font-black uppercase text-[#1A1A1A] underline decoration-2 hover:opacity-75"
                      >
                        + Add First City
                      </button>
                    </div>
                  ) : (
                    stateCities.map((city) => {
                      const cityAreas = areasMap[city.id] || [];

                      return (
                        <div
                          key={city.id}
                          className="bg-[#FAF7EC] border-2 border-[#1A1A1A] rounded-[12px] p-3 space-y-2.5 transition-all shadow-[2px_2px_0px_0px_#1A1A1A]"
                        >
                          {/* City Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black uppercase tracking-tight text-[#1A1A1A]">
                                  {city.name}
                                </span>
                                <div className="flex items-center gap-1 ml-1 opacity-70 hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditCity(city, e)}
                                    title="Edit City"
                                    className="p-0.5 hover:text-black"
                                  >
                                    <Pencil className="h-3 w-3 stroke-[2.5]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handlePromptDelete("city", city.id, city.name, e)}
                                    title="Delete City"
                                    className="p-0.5 hover:text-[#FF8E72]"
                                  >
                                    <Trash2 className="h-3 w-3 stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-[10px] font-mono font-bold text-[#5C5647] mt-0.5">
                                {!state.isActive
                                  ? "Off with state"
                                  : !city.isActive
                                  ? "City switched off"
                                  : `${cityAreas.length} ${cityAreas.length === 1 ? "area" : "areas"}`}
                              </div>
                            </div>

                            {/* City Toggle Switch */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={city.isActive}
                              onClick={(e) => handleToggleCityActive(city, state.id, e)}
                              title={city.isActive ? "Disable City" : "Enable City"}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-[#1A1A1A] transition-colors duration-200 ease-in-out ${
                                city.isActive && state.isActive ? "bg-[#8FD694]" : "bg-[#D9D2BD]"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full border-2 border-[#1A1A1A] bg-white shadow-xs transition duration-200 ease-in-out ${
                                  city.isActive && state.isActive ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Areas inside City */}
                          <div className="space-y-1.5">
                            {cityAreas.length === 0 ? (
                              <div className="text-[10px] font-semibold text-[#5C5647] py-1 text-center italic">
                                No postal areas configured
                              </div>
                            ) : (
                              cityAreas.map((area) => {
                                const isAreaLive = area.isActive && city.isActive && state.isActive;

                                return (
                                  <div
                                    key={area.id}
                                    className={`flex items-center justify-between py-1.5 px-2 bg-white border border-[#1A1A1A] rounded-[8px] transition-colors ${
                                      !isAreaLive ? "opacity-75 bg-stone-50" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate pr-1">
                                      <span className="text-xs font-bold text-[#1A1A1A] truncate">
                                        {area.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenEditArea(area, e)}
                                        title="Edit Area"
                                        className="opacity-50 hover:opacity-100 transition-opacity p-0.5"
                                      >
                                        <Pencil className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handlePromptDelete("area", area.id, area.name, e)}
                                        title="Delete Area"
                                        className="opacity-50 hover:opacity-100 hover:text-[#FF8E72] transition-opacity p-0.5"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Pincode Badge */}
                                      <span className="border-2 border-[#1A1A1A] rounded-[6px] px-1.5 py-0.5 text-[10px] bg-white font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#1A1A1A]">
                                        {area.pincode}
                                      </span>

                                      {/* Area Toggle Switch */}
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={area.isActive}
                                        onClick={(e) => handleToggleAreaActive(area, city.id, e)}
                                        title={area.isActive ? "Disable Area" : "Enable Area"}
                                        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-[#1A1A1A] transition-colors duration-200 ease-in-out ${
                                          isAreaLive ? "bg-[#8FD694]" : "bg-[#D9D2BD]"
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full border-2 border-[#1A1A1A] bg-white shadow-xs transition duration-200 ease-in-out ${
                                            isAreaLive ? "translate-x-3.5" : "translate-x-0.5"
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}

                            {/* + ADD AREA / PIN Dashed Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenAddArea(city.id, e)}
                              className="w-full border-2 border-dashed border-[#1A1A1A] rounded-[8px] bg-white hover:bg-[#FFD84D]/30 py-1.5 px-2 text-center text-[10px] font-black uppercase text-[#1A1A1A] tracking-wider transition-all cursor-pointer shadow-xs active:translate-y-0.5"
                            >
                              + Add Area / PIN
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* State Card Footer Actions */}
                <div className="p-3 border-t-2 border-[#1A1A1A] bg-[#FAF7EC] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenAddCity(state.id, e)}
                    className="border-2 border-[#1A1A1A] bg-white hover:bg-stone-50 text-[#1A1A1A] px-3 py-1.5 text-xs font-black uppercase rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                  >
                    + Add City
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditState(state, e)}
                      className="border-2 border-[#1A1A1A] bg-white hover:bg-stone-50 text-[#1A1A1A] px-3 py-1.5 text-xs font-black uppercase rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handlePromptDelete("state", state.id, state.name, e)}
                      className="border-2 border-[#1A1A1A] bg-[#FFD9D0] hover:bg-[#FFC6B8] text-[#1A1A1A] px-3 py-1.5 text-xs font-black uppercase rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. MODALS (Add/Edit State, City, Area, Delete, 409 Conflict)  */}
      {/* ============================================================= */}

      {/* 1. State Modal */}
      <Dialog open={stateModalOpen} onOpenChange={setStateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingState ? `Edit State: ${editingState.name}` : "Add New State"}
            </DialogTitle>
            <DialogDescription>
              States define primary geographic operational boundaries.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveState} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-[#1A1A1A] block mb-1">
                State Name *
              </label>
              <Input
                required
                value={stateFormName}
                onChange={(e) => setStateFormName(e.target.value)}
                placeholder="e.g. Maharashtra, Chhattisgarh"
                className="font-bold border-2 border-[#1A1A1A] rounded-[10px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="stateActiveCheck"
                checked={stateFormActive}
                onChange={(e) => setStateFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-[#1A1A1A] rounded-[4px] text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="stateActiveCheck"
                className="text-xs font-bold text-[#1A1A1A] cursor-pointer select-none"
              >
                Mark state active for delivery operations
              </label>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t-2 border-[#1A1A1A]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingState ? (
                  "Save Changes"
                ) : (
                  "Create State"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. City Modal */}
      <Dialog open={cityModalOpen} onOpenChange={setCityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCity ? `Edit City: ${editingCity.name}` : "Add New City"}
            </DialogTitle>
            <DialogDescription>
              Cities represent municipal dispatch territories under a state.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCity} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-[#1A1A1A] block mb-1">
                City Name *
              </label>
              <Input
                required
                value={cityFormName}
                onChange={(e) => setCityFormName(e.target.value)}
                placeholder="e.g. Dombivali, Raipur, Bhilai"
                className="font-bold border-2 border-[#1A1A1A] rounded-[10px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="cityActiveCheck"
                checked={cityFormActive}
                onChange={(e) => setCityFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-[#1A1A1A] rounded-[4px] text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="cityActiveCheck"
                className="text-xs font-bold text-[#1A1A1A] cursor-pointer select-none"
              >
                Mark city serviceable for deliveries
              </label>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t-2 border-[#1A1A1A]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCityModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingCity ? (
                  "Save Changes"
                ) : (
                  "Create City"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Area Modal */}
      <Dialog open={areaModalOpen} onOpenChange={setAreaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingArea ? `Edit Hub: ${editingArea.name}` : "Add Serviceable Area & PIN"}
            </DialogTitle>
            <DialogDescription>
              Postal area clusters define localized morning milk drop routes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveArea} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-[#1A1A1A] block mb-1">
                Area / Colony Name *
              </label>
              <Input
                required
                value={areaFormName}
                onChange={(e) => setAreaFormName(e.target.value)}
                placeholder="e.g. Star Colony, Shankar Nagar"
                className="font-bold border-2 border-[#1A1A1A] rounded-[10px]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#1A1A1A] block mb-1">
                6-Digit PIN Code *
              </label>
              <Input
                required
                maxLength={6}
                value={areaFormPincode}
                onChange={(e) => setAreaFormPincode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 421204, 492007"
                className="font-mono font-bold border-2 border-[#1A1A1A] rounded-[10px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="areaActiveCheck"
                checked={areaFormActive}
                onChange={(e) => setAreaFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-[#1A1A1A] rounded-[4px] text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="areaActiveCheck"
                className="text-xs font-bold text-[#1A1A1A] cursor-pointer select-none"
              >
                Mark hub active for doorstep fulfillment
              </label>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t-2 border-[#1A1A1A]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAreaModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingArea ? (
                  "Save Changes"
                ) : (
                  "Create Hub"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <AlertTriangle className="h-5 w-5 text-[#FFD9D0] stroke-[2.5]" />
              <span>Confirm Delete Location</span>
            </DialogTitle>
            <DialogDescription>
              This operational location record will be permanently purged.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <p className="text-xs font-bold text-[#1A1A1A]">
              Are you sure you want to delete {deleteTarget?.type.toUpperCase()} &quot;{deleteTarget?.name}&quot;?
            </p>
            <div className="bg-[#FAF7EC] border-2 border-[#1A1A1A] p-2.5 rounded-[10px] text-[11px] font-semibold text-[#5C5647]">
              Notice: If customer delivery subscriptions or nested child records exist, deletion will be blocked with a 409 safety warning.
            </div>
          </div>

          <DialogFooter className="mt-2 border-t-2 border-[#1A1A1A] pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                </span>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. 409 Conflict Resolution Safety Modal */}
      <Dialog
        open={Boolean(conflictInfo)}
        onOpenChange={(open) => {
          if (!open) setConflictInfo(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#FFD9D0] border-2 border-[#1A1A1A]">
          <DialogHeader className="border-b-2 border-[#1A1A1A]">
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <AlertTriangle className="h-6 w-6 stroke-[3] text-[#1A1A1A] shrink-0" />
              <span>CANNOT DELETE LOCATION</span>
            </DialogTitle>
            <DialogDescription className="text-[#1A1A1A] font-bold text-xs">
              Dependent records or customer addresses exist.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="bg-white border-2 border-[#1A1A1A] p-3 text-xs font-bold text-[#1A1A1A] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A]">
              <p className="leading-relaxed">
                {conflictInfo?.message ||
                  `${conflictInfo?.type.toUpperCase()} "${conflictInfo?.name}" has active child records or customer delivery addresses. Disable it instead to halt deliveries without breaking historical records.`}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2 border-t-2 border-[#1A1A1A] pt-3 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConflictInfo(null)}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleDisableInstead}
              disabled={isSubmitting}
              className="bg-[#FFD84D] hover:bg-[#E6C23D] text-[#1A1A1A] font-black"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Disabling...
                </span>
              ) : (
                "DISABLE INSTEAD"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
