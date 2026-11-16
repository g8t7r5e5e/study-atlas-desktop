"""Pure workload and aggregate feasibility calculations; minutes throughout."""
import math


def number(value, name, minimum=0):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<minimum:
        raise ValueError(f'Invalid {name}')
    return value


def estimate(activity):
    kind=activity['kind']
    def n(key,default=None,minimum=0):
        value=activity.get(key,default)
        if value is None:raise KeyError(key)
        return number(value,key,minimum)
    if kind=='video':
        return n('remaining_runtime_minutes')/n('playback_speed',1,0.01)+n('overhead_minutes',0)
    if kind=='reading':
        return n('remaining_baseline_minutes')*n('pace_multiplier',1,0.01)
    if kind=='questions':
        return n('attempts')*n('minutes_per_attempt')+n('review_minutes')
    if kind=='cards':
        return (n('review_events')*n('seconds_per_review')+n('new_cards')*n('seconds_per_new_card')+n('relearning_seconds',0))/60
    if kind=='fixed':return n('minutes')
    raise ValueError('Unknown activity kind')


def assess(activities,days):
    """Deduplicate identical occurrences, flag unknown estimates, never claim slot fit."""
    seen={};total=0;missing=[];duplicate_count=0
    for activity in activities:
        key=activity['occurrence_id']
        if not isinstance(key,str) or not key.strip():raise ValueError('Missing occurrence identity')
        if key in seen:
            if seen[key]!=activity:raise ValueError('Conflicting duplicate occurrence')
            duplicate_count+=1;continue
        seen[key]=activity
        if activity.get('completed',False):continue
        try:total+=estimate(activity)
        except KeyError as error:missing.append({'occurrence_id':key,'missing':str(error)})
    capacity=0;dates=set();conflicts=[]
    for day in days:
        date=day['date']
        from datetime import date as Date
        if Date.fromisoformat(date).isoformat()!=date:raise ValueError('Invalid date')
        if date in dates:raise ValueError('Duplicate date')
        dates.add(date)
        available=number(day['available_minutes'],'available_minutes')
        reserved=number(day.get('commitments_minutes',0),'commitments_minutes')+number(day.get('buffer_minutes',0),'buffer_minutes')
        if reserved>available:conflicts.append({'date':date,'overbooked_minutes':reserved-available})
        capacity+=max(0,available-reserved)
    deficit=max(0,total-capacity)
    return {'known_workload_minutes':total,'usable_capacity_minutes':capacity,'shortfall_minutes':deficit,
            'spare_minutes':max(0,capacity-total),'missing_estimates':missing,'duplicate_occurrences_removed':duplicate_count,
            'capacity_conflicts':conflicts,'status':'incomplete_inputs' if missing else 'capacity_conflict' if conflicts else 'aggregate_shortfall' if deficit else 'aggregate_fits',
            'schedule_feasibility_proven':False,
            'alternatives':[] if not deficit else [{'action':'add_capacity','minutes':deficit},{'action':'extend_timeline','additional_usable_minutes_needed':deficit},{'action':'reduce_optional_scope','minutes':deficit}]}
