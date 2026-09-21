import { apiRequest } from './client'
export type Member = { id:string; person:{id:string;fullName:string;cpf:string;birthDate:string|null;phone:string|null;email:string|null;city:string|null;photoPath?:string|null;accessEvents?:any[];user?:{id:string;active:boolean}|null}; category:{id:string;name:string;isDependent?:boolean;requiresHolder?:boolean}; titularMemberId?:string|null; titular?:{id:string;person:{fullName:string}}|null; financialResponsible?:{id:string;name:string}|null; relationship?:string|null; registrationNumber:string|null; admissionDate:string; status:string; notes:string|null; access:any; annualDueDate?:string|null; dependents:any[]; charges?:any[] }
const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') ?? ''}` })
export const listMembers = (query='') => apiRequest<Member[]>(`/api/members${query}`, { headers: auth() })
export const getMember = (id:string) => apiRequest<Member>(`/api/members/${id}`, { headers: auth() })
export const categories = () => apiRequest<Array<{id:string;name:string;isDependent:boolean;requiresHolder:boolean}>>('/api/members/categories', { headers: auth() })
export const createMember = (body: any) => apiRequest<Member>('/api/members', { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const updateMember = (id:string, body:any) => apiRequest<Member>(`/api/members/${id}`, { method:'PUT', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const addDependent = (id:string, body:any) => apiRequest(`/api/members/${id}/dependents`, { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const updateDependent = (memberId:string, dependentId:string, body:any) => apiRequest(`/api/members/${memberId}/dependents/${dependentId}`, { method:'PUT', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const removeDependent = (memberId:string, dependentId:string) => apiRequest(`/api/members/${memberId}/dependents/${dependentId}`, { method:'DELETE', headers:auth() })
export const setMemberStatus = (id:string, status:'ACTIVE'|'INACTIVE') => apiRequest<Member>(`/api/members/${id}/status`, { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
export const deleteMember = (id:string) => apiRequest<{ok:boolean}>(`/api/members/${id}`, { method:'DELETE', headers:auth() })

export const uploadMemberPhoto = (id:string, file:File) => { const body = new FormData(); body.append('file', file); return apiRequest<Member>(`/api/members/${id}/photo`, { method:'POST', headers:auth(), body }) }
export const searchHolders = (q:string) => apiRequest<Array<{id:string;name:string;cpf:string}>>(`/api/members/holders/search?q=${encodeURIComponent(q)}`, { headers: auth() })
export const toggleMemberAccess = (id:string, active:boolean) => apiRequest(`/api/members/${id}/access/toggle`, { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify({active}) })
export const resetMemberPassword = (id:string) => apiRequest<{message:string}>(`/api/members/${id}/access/reset-password`, { method:'POST', headers:auth() })
