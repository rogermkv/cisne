import { apiRequest } from './client'
export type Member = { id:string; person:{id:string;fullName:string;cpf:string;birthDate:string|null;phone:string|null;email:string|null;city:string|null;photoPath?:string|null;accessEvents?:any[];user?:{id:string;active:boolean}|null}; category:{id:string;name:string}; titularMemberId?:string|null; titular?:{id:string;person:{fullName:string}}|null; relationship?:string|null; registrationNumber:string|null; admissionDate:string; status:string; notes:string|null; access:string; dependents:any[]; charges?:any[] }
const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') ?? ''}` })
export const listMembers = (query='') => apiRequest<Member[]>(`/api/members${query}`, { headers: auth() })
export const categories = () => apiRequest<Array<{id:string;name:string}>>('/api/members/categories', { headers: auth() })
export const createMember = (body: any) => apiRequest<Member>('/api/members', { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const updateMember = (id:string, body:any) => apiRequest<Member>(`/api/members/${id}`, { method:'PUT', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const addDependent = (id:string, body:any) => apiRequest(`/api/members/${id}/dependents`, { method:'POST', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const updateDependent = (memberId:string, dependentId:string, body:any) => apiRequest(`/api/members/${memberId}/dependents/${dependentId}`, { method:'PUT', headers:{...auth(),'Content-Type':'application/json'}, body:JSON.stringify(body) })
export const removeDependent = (memberId:string, dependentId:string) => apiRequest(`/api/members/${memberId}/dependents/${dependentId}`, { method:'DELETE', headers:auth() })
