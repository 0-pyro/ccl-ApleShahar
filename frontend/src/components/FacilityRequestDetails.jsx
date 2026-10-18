import React from 'react';
import { CheckSquare, XSquare } from 'lucide-react';

const FacilityRequestDetails = ({
  selectedRequest,
  setSelectedRequest,
  reason,
  setReason,
  setActionType,
  handleAction
}) => {
  if (!selectedRequest) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden transform animate-fade-in-right">
        <div className="p-8 pb-4 flex justify-between items-center relative z-10">
          <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold mb-2 inline-block">Review Request</div>
          <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors shrink-0 -mt-8 -mr-2">&times;</button>
        </div>
        <form onSubmit={handleAction} className="p-8 pt-0">
          <h3 className="text-2xl font-black text-stone-800 mb-2 capitalize">{selectedRequest.type} at {selectedRequest.location}</h3>
          <p className="text-sm font-medium text-stone-500 mb-6 leading-relaxed bg-stone-50 p-4 rounded-2xl">{selectedRequest.description}</p>

          <div className="mb-8">
            <label className="block text-sm font-bold text-stone-600 mb-2 pl-2">Provide a reason for your decision</label>
            <textarea 
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-5 py-4 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 focus:outline-none transition-all placeholder:text-stone-300 font-medium" 
              placeholder="e.g. Budget approved for this quarter..." 
              required
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4">
            <button 
              type="submit" 
              onClick={() => setActionType('Reject')}
              className="w-full sm:w-auto px-6 py-3 font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <XSquare className="w-5 h-5" /> Not now
            </button>
            <button 
              type="submit" 
              onClick={() => setActionType('Accept')}
              className="w-full sm:w-auto px-6 py-3 font-black bg-emerald-500 text-white hover:bg-emerald-600 rounded-2xl transition-all shadow-lg shadow-emerald-200 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <CheckSquare className="w-5 h-5" /> Let's build it!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacilityRequestDetails;
