import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  getMyComplaints,
  getStoredUser,
  getUserRole,
  getWardComplaints,
  handleApiError,
} from "../lib/api";

const statusStyles = {
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  in_progress: "bg-sky-50 text-sky-600 border-sky-100",
  resolved: "bg-violet-50 text-violet-600 border-violet-100",
  closed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rejected: "bg-rose-50 text-rose-600 border-rose-100",
  "Just Reported": "bg-slate-50 text-slate-600 border-slate-100",
  Helping: "bg-amber-50 text-amber-600 border-amber-100",
  Fixed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Satisfied: "bg-sky-50 text-sky-600 border-sky-100",
  Revoked: "bg-rose-50 text-rose-600 border-rose-100",
  Reopened: "bg-orange-50 text-orange-600 border-orange-100",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved — Awaiting Your Review",
  closed: "Closed",
  rejected: "Rejected",
};

const toUiComplaint = (item) => {
  const id = String(
    item?.complaint_id || item?.id || item?._id || "N/A"
  );

  const issueType = item?.issue_type || item?.type || "";
  const description = item?.prob_description || item?.description || item?.details || "";
  const title = issueType
    ? issueType.charAt(0).toUpperCase() + issueType.slice(1).replace(/_/g, " ")
    : description.slice(0, 50) || "Untitled complaint";

  const rawStatus = item?.status || "pending";
  const status = STATUS_LABELS[rawStatus] || rawStatus;

  let location = "-";
  if (item?.location_name) {
    location = item.location_name;
  } else if (item?.location_coords) {
    location =
      typeof item.location_coords === "string"
        ? item.location_coords
        : `${item.location_coords?.lat ?? "-"}, ${item.location_coords?.lng ?? "-"}`;
  } else if (item?.location) {
    location =
      typeof item.location === "string"
        ? item.location
        : `${item.location?.latitude ?? "-"}, ${item.location?.longitude ?? "-"}`;
  }

  return {
    id,
    title,
    description,
    status,
    rawStatus,
    contractor: item?.contractor || item?.assigned_to || null,
    date: item?.created_at ? new Date(item.created_at).toLocaleDateString() : "-",
    location,
    ward: item?.ward_no || item?.ward || "-",
    photo: item?.image_link || item?.photo || item?.image_url || null,
    raw: item,
  };
};

const ViewComplains = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const user = useMemo(() => getStoredUser(), []);
  const isCitizen = getUserRole(user) === "citizen";
  const wardNo = user?.ward_no || user?.user_metadata?.ward_no;

  const filteredComplaints = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data = isCitizen
          ? await getMyComplaints()
          : await getWardComplaints(wardNo);

        // Backend returns { success: true, complaints: [...] }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.complaints)
            ? data.complaints
            : [];

        setComplaints(list.map(toUiComplaint));
      } catch (err) {
        setError(handleApiError(err, navigate));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isCitizen, wardNo, navigate]);

  const openComplaint = (complaint) => {
    navigate(`/manage-complaint?id=${complaint.id}`, { state: { complaint } });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex lg:justify-end mb-8">
          <div className="relative w-full max-w-sm">
            <input
              aria-label="Search complaints"
              type="text"
              placeholder="Search by issue, ID, location or status"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          {loading && (
            <div className="p-8 text-center text-slate-600">
              <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin mr-2 align-middle"></span>
              Loading complaints...
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Issue</th>
                    <th className="px-5 py-4 font-semibold">Reported</th>
                    <th className="px-5 py-4 font-semibold">Ward</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{complaint.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {complaint.location} •{" "}
                          {complaint.description
                            ? complaint.description.slice(0, 70) + (complaint.description.length > 70 ? "..." : "")
                            : "No description"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{complaint.date}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{complaint.ward}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[complaint.rawStatus] ||
                            statusStyles[complaint.status] ||
                            "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                        >
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openComplaint(complaint)}
                          className="rounded-2xl bg-[#d5b153] px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm shadow-amber-200 transition hover:bg-[#d59e3c] cursor-pointer"
                        >
                          {isCitizen ? "View" : "Assist"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredComplaints.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <p className="text-lg font-semibold">
                    {searchTerm ? "No reports match your search." : "No complaints found."}
                  </p>
                  <p className="mt-2 text-sm">
                    {searchTerm
                      ? "Try a different keyword or clear the search filter."
                      : isCitizen
                        ? "You haven't submitted any complaints yet."
                        : "No complaints have been filed in your ward yet."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewComplains;
