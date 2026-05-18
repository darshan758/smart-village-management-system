import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapComponent from '../components/MapComponent';
import api from '../utils/api';
import { CATEGORIES, PRIORITY_LIST } from '../utils/helpers';
import { Upload, MapPin, X, Image, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComplaintForm() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [darkMode, setDarkMode] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium',
    locationName: '',
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [geoTagDetected, setGeoTagDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: details, 2: location, 3: review

  const toggleDark = () => {
    setDarkMode((d) => { document.documentElement.classList.toggle('dark', !d); return !d; });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setGeoTagDetected(false);

    // Try reading EXIF in browser (basic check — actual extraction happens on backend)
    toast.success('Image selected! GeoTag will be extracted automatically on upload.');
  };

  const handleMapClick = (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);
    setGeoTagDetected(false);
    toast.success(`Location pinned: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Please enter a complaint title');
    if (!form.category)      return toast.error('Please select a category');
    if (!form.description.trim()) return toast.error('Please add a description');
    if (!lat && !lng && !image)  return toast.error('Please pin a location on the map or upload a geotagged image');

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      if (lat) fd.append('latitude', lat);
      if (lng) fd.append('longitude', lng);

      const { data } = await api.post('/complaints', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.geoTagExtracted) {
        toast.success('GeoTag detected from image! Location saved automatically. ✅');
      } else {
        toast.success('Complaint submitted successfully! 🎉');
      }

      navigate(`/complaint/${data.complaint._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Details', 'Location', 'Review'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar darkMode={darkMode} toggleDark={toggleDark} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report an Issue</h1>
          <p className="text-gray-500 text-sm mt-1">Fill the form below to report a civic problem</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-2 text-sm font-medium transition-all ${
                  step === i + 1
                    ? 'text-primary-600'
                    : step > i + 1
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  step === i + 1 ? 'border-primary-600 bg-primary-50 text-primary-600'
                  : step > i + 1 ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 text-gray-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                <span className="hidden sm:block">{s}</span>
              </button>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ─── STEP 1: Details ─── */}
        {step === 1 && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Complaint Title *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Broken street light near school" className="input-field" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
                <select name="category" value={form.category} onChange={handleChange} className="input-field">
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="input-field">
                  {PRIORITY_LIST.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the issue in detail…"
                className="input-field resize-none"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Upload Image <span className="text-gray-400 text-xs">(optional · max 10MB · GeoTag auto-detected)</span>
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setImage(null); setImagePreview(null); setGeoTagDetected(false); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                    <Image size={11} /> {image?.name}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all"
                >
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload image</span>
                  <span className="text-xs text-gray-400">JPEG, PNG, WebP supported</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>

            <button onClick={() => setStep(2)} className="btn-primary w-full">
              Next: Add Location →
            </button>
          </div>
        )}

        {/* ─── STEP 2: Location ─── */}
        {step === 2 && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">How location works:</p>
                <p>1. If your uploaded image has GPS data → location is auto-detected on the server.</p>
                <p>2. Otherwise, click the map below to manually pin the exact location.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Location Name <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                name="locationName"
                value={form.locationName}
                onChange={handleChange}
                placeholder="e.g. Near Panchayat Office, Main Road"
                className="input-field"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Click on the map to pin location
                {lat && lng && <span className="text-primary-600 ml-2 font-normal text-xs">📍 {lat.toFixed(4)}, {lng.toFixed(4)}</span>}
              </p>
              <MapComponent
                height="320px"
                selectable
                onLocationSelect={handleMapClick}
                selectedLat={lat}
                selectedLng={lng}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Next: Review →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Review ─── */}
        {step === 3 && (
          <div className="card p-6 space-y-4 animate-fade-in">
            <h3 className="font-bold text-gray-900 dark:text-white">Review Your Complaint</h3>

            <div className="space-y-3 text-sm">
              {[
                ['Title', form.title],
                ['Category', form.category],
                ['Priority', form.priority],
                ['Description', form.description],
                ['Location Name', form.locationName || '—'],
                ['Coordinates', lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Will be extracted from image or not set'],
                ['Image', image ? image.name : 'No image attached'],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="font-medium text-gray-600 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-gray-900 dark:text-white break-all">{val}</span>
                </div>
              ))}
            </div>

            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
                {loading ? 'Submitting…' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
