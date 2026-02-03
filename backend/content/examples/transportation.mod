# Transportation Problem
# Classic linear programming example for DSA 5113

# Sets
set ORIGINS;      # Supply locations (warehouses, factories)
set DESTINATIONS; # Demand locations (stores, customers)

# Parameters
param supply {ORIGINS} >= 0;           # Available supply at each origin
param demand {DESTINATIONS} >= 0;       # Required demand at each destination
param cost {ORIGINS, DESTINATIONS} >= 0; # Shipping cost per unit

# Decision Variables
var ship {i in ORIGINS, j in DESTINATIONS} >= 0;  # Units shipped from i to j

# Objective: Minimize total shipping cost
minimize TotalCost:
    sum {i in ORIGINS, j in DESTINATIONS} cost[i,j] * ship[i,j];

# Constraints

# Supply constraint: Cannot ship more than available
subject to SupplyLimit {i in ORIGINS}:
    sum {j in DESTINATIONS} ship[i,j] <= supply[i];

# Demand constraint: Must meet all demand
subject to DemandRequirement {j in DESTINATIONS}:
    sum {i in ORIGINS} ship[i,j] >= demand[j];
