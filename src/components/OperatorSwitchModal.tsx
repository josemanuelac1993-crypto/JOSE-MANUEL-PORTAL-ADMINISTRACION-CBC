import React, { useState } from 'react';
import { Operator, OPERATOR_PROFILES, Branch, BRANCHES } from '../types';
import { UserCheck, Shield, Clock, MapPin, X, Plus } from 'lucide-react';

interface OperatorSwitchModalProps {
  currentOperator: Operator;
  onSelectOperator: (operator: Operator) => void;
  onClose: () => void;
}

export const OperatorSwitchModal: React.FC<OperatorSwitchModalProps> = ({
  currentOperator,
  onSelectOperator,
  onClose
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customShift, setCustomShift] = useState('Turno A (06:00 - 14:00)');
  const [customBranch, setCustomBranch] = useState<Branch>('Tesalia Planta Gye');

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newOp: Operator = {
      id: `usr-${Date.now()}`,
      name: customName.trim(),
      code: customCode.trim() || `OPR-${Math.floor(10 + Math.random() * 89)}`,
      role: 'Operador de Consola CCTV',
      shift: customShift,
      branch: customBranch
    };

    onSelectOperator(newOp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-900">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Control de Acceso de Operadores de Consola
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona tu perfil de turno o ingresa tus credenciales de operador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {!customMode ? (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Operadores de Turno Registrados
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {OPERATOR_PROFILES.map((op) => {
                  const isSelected = currentOperator.id === op.id;
                  const isAdmin = op.id === 'usr-admin';

                  return (
                    <div
                      key={op.id}
                      onClick={() => {
                        onSelectOperator(op);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-red-50/80 border-red-500 shadow-xs ring-1 ring-red-500'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-red-600 text-white'
                        }`}>
                          {isAdmin ? <Shield className="w-4 h-4" /> : op.code.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {op.name}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                Administrador General
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {op.shift}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-teal-700 font-semibold">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              {op.branch}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-xs text-red-700 font-bold bg-red-100 px-2.5 py-1 rounded-md border border-red-300">
                          Activo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs text-slate-500">¿Eres un nuevo operador de consola?</span>
                <button
                  onClick={() => setCustomMode(true)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar mi usuario de turno
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Ingresa los datos del Operador de Consola:
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nombre y Apellidos</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Roberto Alarcón Cevallos"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Código de Operador</label>
                  <input
                    type="text"
                    placeholder="OPR-12"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Turno</label>
                  <select
                    value={customShift}
                    onChange={(e) => setCustomShift(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white font-medium"
                  >
                    <option value="Turno A (06:00 - 14:00)">Turno A (06:00 - 14:00)</option>
                    <option value="Turno B (14:00 - 22:00)">Turno B (14:00 - 22:00)</option>
                    <option value="Turno C (22:00 - 06:00)">Turno C (22:00 - 06:00)</option>
                    <option value="Turno Rotativo">Turno Rotativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Sucursal / Consola Asignada</label>
                <select
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value as Branch)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white font-medium"
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  Volver a lista
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Entrar como este Operador
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
